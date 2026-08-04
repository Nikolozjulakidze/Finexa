import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || "US")
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  throw new Error(
    "PLAID_CLIENT_ID and PLAID_SECRET must be set in .env for Plaid integration",
  );
}

const environment =
  PlaidEnvironments[PLAID_ENV.toLowerCase()] || PlaidEnvironments.sandbox;

const client = new PlaidApi(
  new Configuration({
    basePath: environment,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
        "PLAID-SECRET": PLAID_SECRET,
      },
    },
  }),
);

export const createLinkToken = async (userId) => {
  const request = {
    user: {
      client_user_id: String(userId),
    },
    client_name: "Nexus",
    products: ["transactions"],
    country_codes: PLAID_COUNTRY_CODES,
    language: "en",
  };

  const response = await client.linkTokenCreate(request);
  return response.data.link_token;
};

export const exchangePublicToken = async (publicToken) => {
  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });
  return response.data;
};

export const fetchPlaidAccounts = async (accessToken) => {
  const response = await client.accountsGet({ access_token: accessToken });
  return response.data;
};

export const fetchPlaidTransactions = async (
  accessToken,
  startDate,
  endDate,
) => {
  const response = await client.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: {
      count: 250,
      offset: 0,
    },
  });
  return response.data;
};
