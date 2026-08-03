import { encrypt, decrypt } from "../utils/encryption.js";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const providerConfigs = {
  bog: {
    name: "Bank of Georgia",
    authUrl:
      "https://account.bog.ge/auth/realms/bog/protocol/openid-connect/auth",
    tokenUrl:
      "https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    scope: process.env.BOG_SCOPE || "openid",
    redirectUri: `${BACKEND_URL}/api/accounts/callback/bog`,
    accountsUrl:
      process.env.BOG_ACCOUNTS_URL ||
      "https://api.bog.ge/psd2/openbanking/v1/accounts",
    transactionsUrl:
      process.env.BOG_TRANSACTIONS_URL ||
      "https://api.bog.ge/psd2/openbanking/v1/accounts/{accountId}/transactions",
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
    accountsUrl:
      process.env.TBC_ACCOUNTS_URL ||
      "https://api.tbcbank.ge/psd2/openbanking/v1/accounts",
    transactionsUrl:
      process.env.TBC_TRANSACTIONS_URL ||
      "https://api.tbcbank.ge/psd2/openbanking/v1/accounts/{accountId}/transactions",
  },
};

const getProviderConfig = (provider) => providerConfigs[provider];

const buildState = (userId, provider) => {
  const payload = { userId, provider, timestamp: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};

const parseState = (state) => {
  try {
    return JSON.parse(Buffer.from(state, "base64").toString("utf8"));
  } catch (error) {
    return null;
  }
};

const getClientCredentials = (provider) => {
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing ${provider.toUpperCase()} client credentials`);
  }

  return { clientId, clientSecret };
};

export const buildAuthorizeUrl = (provider, userId) => {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error("Unsupported provider");
  }

  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  if (!clientId) {
    throw new Error(
      `Missing ${provider.toUpperCase()} client ID configuration`,
    );
  }

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("state", buildState(userId, provider));

  if (provider === "bog") {
    authUrl.searchParams.set("kc_locale", "en");
  }

  return authUrl.toString();
};

export const exchangeCodeForTokens = async (provider, code) => {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error("Unsupported provider");
  }

  const { clientId, clientSecret } = getClientCredentials(provider);
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
    const error = new Error("Token exchange failed");
    error.details = tokenData;
    throw error;
  }

  return tokenData;
};

export const refreshAccessToken = async (connection) => {
  const config = getProviderConfig(connection.provider);
  if (!config) {
    throw new Error("Unsupported provider");
  }

  const refreshToken = decrypt(connection.encrypted_refresh_token);
  const { clientId, clientSecret } = getClientCredentials(connection.provider);

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const tokenData = await response.json();
  if (!response.ok) {
    const error = new Error("Refresh token exchange failed");
    error.details = tokenData;
    throw error;
  }

  return tokenData;
};

const getResourceUrl = (provider, type, accountId) => {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error("Unsupported provider");
  }

  const url = type === "accounts" ? config.accountsUrl : config.transactionsUrl;
  if (!url) {
    throw new Error(
      `Missing ${provider.toUpperCase()} ${type} URL configuration`,
    );
  }

  return type === "transactions"
    ? url.replace("{accountId}", encodeURIComponent(accountId))
    : url;
};

export const fetchBankAccounts = async (provider, accessToken) => {
  const url = getResourceUrl(provider, "accounts");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error("Failed to fetch bank accounts");
    error.details = data;
    throw error;
  }

  return Array.isArray(data.accounts) ? data.accounts : data.data || data;
};

export const fetchBankTransactions = async (
  provider,
  accessToken,
  accountId,
  fromDate,
  toDate,
) => {
  const url = getResourceUrl(provider, "transactions", accountId);
  const params = new URLSearchParams();
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const requestUrl = params.toString() ? `${url}?${params.toString()}` : url;

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error("Failed to fetch transactions");
    error.details = data;
    throw error;
  }

  return Array.isArray(data.transactions)
    ? data.transactions
    : Array.isArray(data.data)
      ? data.data
      : data;
};

export { getProviderConfig, parseState };
