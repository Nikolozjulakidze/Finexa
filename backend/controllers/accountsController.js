import pool from "../db.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const providerConfigs = {
  bog: {
    name: "Bank of Georgia",
    authUrl:
      "https://account.bog.ge/auth/realms/bog/protocol/openid-connect/auth",
    tokenUrl:
      "https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    scope: "corp",
    redirectUri: `${BACKEND_URL}/api/accounts/callback/bog`,
  },
  tbc: {
    name: "TBC Bank",
    authUrl:
      process.env.TBC_AUTH_URL ||
      "https://api.tbcbank.ge/psd2/openbanking/oauth/authorize",
    tokenUrl:
      process.env.TBC_TOKEN_URL ||
      "https://api.tbcbank.ge/psd2/openbanking/oauth/token",
    scope: process.env.TBC_SCOPE || "openid",
    redirectUri: `${BACKEND_URL}/api/accounts/callback/tbc`,
  },
};

const getProviderConfig = (provider) => providerConfigs[provider];

const buildState = (userId, provider) => {
  return Buffer.from(
    JSON.stringify({ userId, provider, timestamp: Date.now() }),
  ).toString("base64");
};

const parseState = (state) => {
  try {
    return JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
  } catch (error) {
    return null;
  }
};

export const startBankLink = async (req, res) => {
  const { provider } = req.params;
  const config = getProviderConfig(provider);

  if (!config) {
    return res.status(400).json({ message: "Unsupported provider" });
  }

  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  if (!clientId) {
    return res
      .status(500)
      .json({
        message: `Missing ${provider.toUpperCase()} client ID configuration`,
      });
  }

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("state", buildState(req.userId, provider));

  if (provider === "bog") {
    authUrl.searchParams.set("kc_locale", "en");
  }

  return res.json({ authUrl: authUrl.toString() });
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

  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .json({
        message: `Missing ${provider.toUpperCase()} client credentials`,
      });
  }

  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Bank callback token exchange failed", tokenData);
      return res
        .status(502)
        .json({ message: "Token exchange failed", details: tokenData });
    }

    const accountName = config.name;
    await pool.query(
      `INSERT INTO accounts (user_id, provider, provider_account_id, name, currency, metadata) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, provider, null, accountName, null, tokenData],
    );

    const redirectUrl = `${FRONTEND_URL}/linked-accounts?provider=${provider}&status=linked`;
    return res.redirect(redirectUrl);
  } catch (fetchError) {
    console.error("Bank callback error", fetchError);
    return res.status(500).json({ message: "Bank callback failed" });
  }
};

export const listAccounts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
