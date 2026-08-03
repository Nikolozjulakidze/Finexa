import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import api from "../lib/axios.js";
import { API_PATHS } from "../utils/apiPaths.js";
import Button from "../components/ui/Button.jsx";

const BankConnections = () => {
  const [linkToken, setLinkToken] = useState(null);
  const [connections, setConnections] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConnections();
    fetchAccounts();
    createLinkToken();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await api.get(API_PATHS.PLAID.CONNECTIONS);
      setConnections(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get(API_PATHS.PLAID.ACCOUNTS);
      setAccounts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const createLinkToken = async () => {
    try {
      const res = await api.post(API_PATHS.PLAID.LINK_TOKEN);
      setLinkToken(res.data.linkToken);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.details ||
        error.response?.data?.message ||
        error.message ||
        "Unable to create Plaid link token.";
      alert(`Unable to create Plaid link token: ${message}`);
    }
  };

  const onSuccess = async (public_token, metadata) => {
    setLoading(true);
    try {
      const res = await api.post(API_PATHS.PLAID.EXCHANGE_TOKEN, {
        publicToken: public_token,
        institutionName: metadata.institution?.name || null,
      });
      setLinkToken(null);
      await fetchConnections();
      if (res.data?.connection?.id) {
        await syncConnection(res.data.connection.id);
      } else {
        await fetchAccounts();
      }
      alert("Successfully linked and synced your account.");
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.details ||
        error.response?.data?.message ||
        error.message ||
        "Unable to link account.";
      alert(`Unable to link account: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const syncConnection = async (connectionId) => {
    setLoading(true);
    try {
      await api.post(API_PATHS.PLAID.SYNC(connectionId));
      await fetchConnections();
      await fetchAccounts();
      alert("Account data synced successfully.");
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.details ||
        error.response?.data?.message ||
        error.message ||
        "Unable to sync account.";
      alert(`Unable to sync account: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const importConnection = async (connectionId) => {
    setLoading(true);
    try {
      const res = await api.post(API_PATHS.ACCOUNTS.IMPORT(connectionId));
      await fetchConnections();
      await fetchAccounts();
      const imported = res.data?.imported ?? 0;
      alert(`Imported ${imported} transactions.`);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.details ||
        error.response?.data?.message ||
        error.message ||
        "Unable to import transactions.";
      alert(`Unable to import: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = async () => {
    if (!linkToken) {
      await createLinkToken();
    }
    if (ready) {
      open();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Accounts
          </h1>
          <p className="text-sm text-text-secondary mt-1.5">
            Connect your bank accounts and supported financial services using
            Plaid.
          </p>
        </div>
        <Button onClick={handleLinkClick} disabled={!ready || loading}>
          {loading ? "Connecting..." : "Connect Account"}
        </Button>
      </div>

      <div className="bg-card-background rounded-3xl border border-border-color p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Connected Items
        </h2>
        {connections.length === 0 ? (
          <div className="text-text-secondary">No connected items yet.</div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="rounded-2xl border border-border-color p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-text-primary">
                      {connection.metadata?.institutionName ||
                        connection.provider}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {connection.status} •{" "}
                      {new Date(connection.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => syncConnection(connection.id)}
                      disabled={loading}
                      size="sm"
                    >
                      Sync
                    </Button>
                    <Button
                      onClick={() => importConnection(connection.id)}
                      disabled={loading}
                      size="sm"
                      variant="secondary"
                    >
                      Import
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card-background rounded-3xl border border-border-color p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Account Balances
        </h2>
        {accounts.length === 0 ? (
          <div className="text-text-secondary">
            No account balances found. Sync a connected item.
          </div>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="rounded-2xl border border-border-color p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-text-primary">
                      {account.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {account.provider} • {account.account_type || "Account"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-text-primary">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: account.currency || "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(account.balance ?? 0)}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Updated{" "}
                      {new Date(account.last_synced_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BankConnections;
