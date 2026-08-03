import pool from "../db.js";
import {
  createLinkToken,
  exchangePublicToken,
  fetchPlaidAccounts,
  fetchPlaidTransactions,
} from "../services/plaidService.js";
import { encrypt, decrypt } from "../utils/encryption.js";

export const createPlaidLinkToken = async (req, res) => {
  try {
    const linkToken = await createLinkToken(req.userId);
    res.json({ linkToken });
  } catch (error) {
    console.error("Plaid link token error", error);
    res.status(500).json({
      message: "Unable to create Plaid link token",
      details:
        error.response?.data || error.data || error.message || "Unknown error",
    });
  }
};

export const exchangePlaidPublicToken = async (req, res) => {
  const { publicToken, institutionName } = req.body;
  if (!publicToken) {
    return res.status(400).json({ message: "Missing public token" });
  }

  try {
    const tokenData = await exchangePublicToken(publicToken);
    const encryptedAccessToken = encrypt(tokenData.access_token);

    const result = await pool.query(
      `INSERT INTO bank_connections (
        user_id,
        provider,
        provider_connection_id,
        status,
        encrypted_access_token,
        token_type,
        metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (user_id, provider, provider_connection_id)
      DO UPDATE SET
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        token_type = EXCLUDED.token_type,
        metadata = EXCLUDED.metadata,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
      [
        req.userId,
        "plaid",
        tokenData.item_id,
        "linked",
        encryptedAccessToken,
        tokenData.item_id ? "Bearer" : null,
        { institutionName, plaid: tokenData },
      ],
    );

    res.json({ connection: result.rows[0] });
  } catch (error) {
    console.error("Plaid exchange error", error);
    res.status(500).json({
      message: "Unable to exchange Plaid public token",
      details: error.response?.data || error.message || error,
    });
  }
};

export const getPlaidConnections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, provider_connection_id, status, metadata, created_at, updated_at FROM bank_connections WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Plaid connections error", error);
    res.status(500).json({ message: "Unable to fetch Plaid connections" });
  }
};

export const getPlaidAccounts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.connection_id, c.provider, b.provider_account_id, b.name, b.account_type, b.currency, b.balance, b.last_synced_at, b.metadata, b.created_at, b.updated_at
       FROM bank_accounts b
       JOIN bank_connections c ON c.id = b.connection_id
       WHERE b.user_id = $1
       ORDER BY b.updated_at DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Plaid accounts error", error);
    res.status(500).json({ message: "Unable to fetch Plaid accounts" });
  }
};

const normalizePlaidAccount = (account) => {
  return {
    providerAccountId: account.account_id || account.id || null,
    name:
      account.name ||
      account.official_name ||
      account.mask ||
      account.subtype ||
      "Plaid Account",
    accountType: account.type || account.subtype || null,
    currency:
      account.balances?.iso_currency_code ||
      account.balances?.unofficial_currency_code ||
      account.currency ||
      "USD",
    balance:
      account.balances?.current ??
      account.balances?.available ??
      account.balances?.limit ??
      null,
    metadata: account,
  };
};

const normalizePlaidTransaction = (transaction) => {
  const providerTxnId =
    transaction.transaction_id ||
    transaction.transaction_id ||
    transaction.id ||
    null;

  const amount = Math.abs(transaction.amount ?? 0);
  const currency =
    transaction.iso_currency_code || transaction.currency || "USD";
  const description =
    transaction.name ||
    transaction.payment_channel ||
    transaction.merchant_name ||
    transaction.original_description ||
    null;
  const merchant = transaction.merchant_name || transaction.merchant || null;
  const transactionDate =
    transaction.date || transaction.transaction_date || null;
  const type = transaction.amount < 0 ? "expense" : "income";

  return {
    providerTxnId,
    amount,
    currency,
    description,
    merchant,
    rawJson: transaction,
    transactionDate,
    type,
  };
};

export const syncPlaidConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const result = await pool.query(
      `SELECT * FROM bank_connections WHERE id = $1 AND user_id = $2`,
      [connectionId, req.userId],
    );

    const connection = result.rows[0];
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    if (!connection.encrypted_access_token) {
      return res.status(400).json({ message: "No access token stored" });
    }

    const decryptedAccessToken = decrypt(connection.encrypted_access_token);
    const accountsData = await fetchPlaidAccounts(decryptedAccessToken);
    const transactionsData = await fetchPlaidTransactions(
      decryptedAccessToken,
      new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .slice(0, 10),
      new Date().toISOString().slice(0, 10),
    );

    const accounts = Array.isArray(accountsData.accounts)
      ? accountsData.accounts
      : accountsData.accounts || accountsData.items || [];

    const syncedAccounts = [];

    for (const account of accounts) {
      const normalized = normalizePlaidAccount(account);
      if (!normalized.providerAccountId) continue;

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
        RETURNING *`;

      const accountResult = await pool.query(upsertAccountQuery, [
        connection.id,
        req.userId,
        normalized.providerAccountId,
        normalized.name,
        normalized.accountType,
        normalized.currency,
        normalized.balance,
        normalized.metadata,
      ]);

      syncedAccounts.push(accountResult.rows[0]);
    }

    const transactions = Array.isArray(transactionsData.transactions)
      ? transactionsData.transactions
      : [];

    for (const transaction of transactions) {
      const normalized = normalizePlaidTransaction(transaction);
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
          null,
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

    await pool.query(
      `UPDATE bank_connections SET last_synced_at = NOW(), status = 'linked', updated_at = NOW() WHERE id = $1`,
      [connection.id],
    );

    res.json({
      accounts: syncedAccounts,
      transactionsCount: transactions.length,
    });
  } catch (error) {
    console.error("Plaid sync error", error);
    res.status(500).json({
      message: "Unable to sync Plaid connection",
      details: error.message,
    });
  }
};
