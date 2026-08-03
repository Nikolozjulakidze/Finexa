import pool from "../db.js";
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchBankAccounts,
  fetchBankTransactions,
  getProviderConfig,
  parseState,
} from "../services/bankService.js";
import { encrypt, decrypt } from "../utils/encryption.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const getConnectionById = async (connectionId, userId) => {
  const result = await pool.query(
    `SELECT * FROM bank_connections WHERE id = $1 AND user_id = $2`,
    [connectionId, userId],
  );
  return result.rows[0];
};

const ensureValidAccessToken = async (connection) => {
  const now = new Date();
  if (connection.expires_at && new Date(connection.expires_at) <= now) {
    const tokenData = await refreshAccessToken(connection);
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = encrypt(
      tokenData.refresh_token || decrypt(connection.encrypted_refresh_token),
    );
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : null;

    const updateResult = await pool.query(
      `UPDATE bank_connections SET encrypted_access_token = $1, encrypted_refresh_token = $2, expires_at = $3, scope = $4, token_type = $5, metadata = $6, updated_at = NOW() WHERE id = $7 RETURNING *`,
      [
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt,
        tokenData.scope || connection.scope,
        tokenData.token_type || connection.token_type,
        tokenData,
        connection.id,
      ],
    );

    return updateResult.rows[0];
  }

  return connection;
};

const normalizeTransaction = (transaction) => {
  const providerTxnId =
    transaction.transaction_id ||
    transaction.id ||
    transaction.txnId ||
    transaction.entryId ||
    null;

  const amount = Number(
    transaction.amount ??
      transaction.transactionAmount ??
      transaction.value ??
      0,
  );
  const currency = transaction.currency || transaction.currencyCode || "USD";
  const description =
    transaction.description ||
    transaction.remittanceInformation ||
    transaction.details ||
    null;
  const merchant = transaction.merchant_name || transaction.merchant || null;
  const rawJson = transaction;
  const transactionDate =
    transaction.transaction_date ||
    transaction.bookingDate ||
    transaction.valueDate ||
    transaction.date ||
    null;
  const type = amount < 0 ? "expense" : "income";

  return {
    providerTxnId,
    amount: Math.abs(amount),
    currency,
    description,
    merchant,
    rawJson,
    transactionDate,
    type,
  };
};

export const startBankLink = async (req, res) => {
  try {
    const { provider } = req.params;
    const authUrl = buildAuthorizeUrl(provider, req.userId);
    return res.json({ authUrl });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const handleBankCallback = async (req, res) => {
  const { provider } = req.params;
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).json({ message: error_description || error });
  }

  if (!code || !state) {
    return res
      .status(400)
      .json({ message: "Missing authorization code or state" });
  }

  const parsedState = parseState(state);
  if (
    !parsedState ||
    !parsedState.userId ||
    parsedState.provider !== provider
  ) {
    return res.status(400).json({ message: "Invalid state parameter" });
  }

  const userId = parsedState.userId;
  const config = getProviderConfig(provider);
  if (!config) {
    return res.status(400).json({ message: "Unsupported provider" });
  }

  try {
    const tokenData = await exchangeCodeForTokens(provider, code);
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = encrypt(tokenData.refresh_token);
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000)
      : null;

    const result = await pool.query(
      `INSERT INTO bank_connections (
        user_id,
        provider,
        provider_connection_id,
        status,
        encrypted_access_token,
        encrypted_refresh_token,
        token_type,
        scope,
        expires_at,
        metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        userId,
        provider,
        tokenData.iss || tokenData.sub || null,
        "linked",
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenData.token_type || "Bearer",
        tokenData.scope || config.scope,
        expiresAt,
        tokenData,
      ],
    );

    const redirectUrl = `${FRONTEND_URL}/linked-accounts?provider=${provider}&status=linked`;
    return res.redirect(redirectUrl);
  } catch (fetchError) {
    console.error("Bank callback error", fetchError);
    return res.status(500).json({
      message: "Bank callback failed",
      details: fetchError.details || fetchError.message,
    });
  }
};

export const listConnections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, status, provider_connection_id, expires_at, scope, metadata, created_at, updated_at FROM bank_connections WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const syncConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await getConnectionById(connectionId, req.userId);
    if (!connection) {
      return res.status(404).json({ message: "Bank connection not found" });
    }

    const activeConnection = await ensureValidAccessToken(connection);
    const accessToken = decrypt(activeConnection.encrypted_access_token);
    const accounts = await fetchBankAccounts(
      activeConnection.provider,
      accessToken,
    );

    for (const account of accounts) {
      const providerAccountId =
        account.id ||
        account.accountId ||
        account.account_id ||
        account.accountNumber ||
        null;
      if (!providerAccountId) continue;

      const upsertAccountQuery = `
        INSERT INTO bank_accounts (
          connection_id,
          user_id,
          provider_account_id,
          name,
          account_type,
          currency,
          balance,
          metadata,
          last_synced_at,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),NOW())
        ON CONFLICT (connection_id, provider_account_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          account_type = EXCLUDED.account_type,
          currency = EXCLUDED.currency,
          balance = EXCLUDED.balance,
          metadata = EXCLUDED.metadata,
          last_synced_at = NOW(),
          updated_at = NOW()
        RETURNING id`;

      const balance =
        account.balance ??
        account.currentBalance ??
        account.availableBalance ??
        null;
      const name =
        account.name ||
        account.displayName ||
        account.product ||
        account.accountType ||
        activeConnection.provider;
      const accountType =
        account.type || account.account_type || account.accountType || null;
      const currency = account.currency || account.currencyCode || "USD";

      const accountResult = await pool.query(upsertAccountQuery, [
        connection.id,
        req.userId,
        providerAccountId,
        name,
        accountType,
        currency,
        balance,
        account,
      ]);

      const bankAccountId = accountResult.rows[0].id;
      const transactions = await fetchBankTransactions(
        activeConnection.provider,
        accessToken,
        providerAccountId,
      );

      for (const transaction of transactions) {
        const normalized = normalizeTransaction(transaction);
        if (!normalized.providerTxnId || !normalized.transactionDate) continue;

        await pool.query(
          `INSERT INTO bank_transactions (
            connection_id,
            account_id,
            user_id,
            provider_transaction_id,
            amount,
            currency,
            transaction_date,
            description,
            merchant,
            raw_json,
            type,
            created_at,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
          ON CONFLICT (connection_id, provider_transaction_id)
          DO UPDATE SET
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            transaction_date = EXCLUDED.transaction_date,
            description = EXCLUDED.description,
            merchant = EXCLUDED.merchant,
            raw_json = EXCLUDED.raw_json,
            type = EXCLUDED.type,
            updated_at = NOW()`,
          [
            connection.id,
            bankAccountId,
            req.userId,
            normalized.providerTxnId,
            normalized.amount,
            normalized.currency,
            normalized.transactionDate,
            normalized.description,
            normalized.merchant,
            normalized.rawJson,
            normalized.type,
          ],
        );
      }
    }

    await pool.query(
      `UPDATE bank_connections SET last_synced_at = NOW(), status = 'linked', updated_at = NOW() WHERE id = $1`,
      [connection.id],
    );

    res.json({ message: "Bank connection synced successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Sync failed", details: error.message || error });
  }
};

export const importBankTransactions = async (req, res) => {
  try {
    const { connectionId } = req.params;
    // ensure connection belongs to user
    const connRes = await pool.query(
      `SELECT id, provider FROM bank_connections WHERE id = $1 AND user_id = $2`,
      [connectionId, req.userId],
    );
    const connection = connRes.rows[0];
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    // Insert bank_transactions that don't yet have a matching transaction
    const insertResult = await pool.query(
      `WITH new_bt AS (
         SELECT bt.*,
                ba.provider_account_id AS provider_account_id,
                bc.provider AS provider
         FROM bank_transactions bt
         JOIN bank_connections bc ON bc.id = bt.connection_id
         LEFT JOIN bank_accounts ba ON ba.id = bt.account_id
         WHERE bt.connection_id = $1
           AND bt.user_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM transactions t
             WHERE t.user_id = bt.user_id
               AND t.provider_txn_id = bt.provider_transaction_id
           )
       )
       INSERT INTO transactions (
         user_id, category_id, card_id, account_id, provider, provider_account_id,
         provider_txn_id, raw_json, amount, type, description, transaction_date, created_at
       )
       SELECT
         new_bt.user_id,
         new_bt.category_id,
         NULL,
         NULL,
         new_bt.provider,
         new_bt.provider_account_id,
         new_bt.provider_transaction_id,
         new_bt.raw_json,
         -- store positive amount
         COALESCE(new_bt.amount, 0)::numeric,
        -- determine type from raw_json.amount if available
        CASE WHEN COALESCE(NULLIF(new_bt.raw_json->>'amount',''), '0')::numeric < 0 THEN 'expense' ELSE 'income' END,
         new_bt.description,
         new_bt.transaction_date,
         NOW()
      FROM new_bt
       RETURNING id`,
      [connectionId, req.userId],
    );

    res.json({
      imported: insertResult.rowCount,
      insertedIds: insertResult.rows.map((r) => r.id),
    });
  } catch (error) {
    console.error("Import bank transactions error", error);
    res.status(500).json({ message: "Import failed", details: error.message });
  }
};
