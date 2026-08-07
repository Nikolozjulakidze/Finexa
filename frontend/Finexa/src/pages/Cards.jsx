import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Star,
  Link2,
  Landmark,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios.js";
import { API_PATHS } from "../utils/apiPaths.js";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Spinner from "../components/Spinner.jsx";
import CardForm from "../components/CardForm.jsx";

const CONNECT_PROVIDERS = [
  { provider: "bog", name: "Bank of Georgia", country: "GE" },
  { provider: "tbc", name: "TBC Bank", country: "GE" },
  { provider: "paysera", name: "Paysera", country: "EU" },
];

const brandIcons = {
  Visa: "💳",
  Mastercard: "💳",
  "American Express": "💳",
  Discover: "💳",
  JCB: "💳",
  "Diners Club": "💳",
  UnionPay: "💳",
  Mir: "💳",
};

const CardPreview = ({ card }) => {
  const color = card.color || "#6366F1";
  const brand = card.brand || "Card";
  const lastFour = card.last_four || "----";
  const displayName = card.name || "Unnamed Card";
  const bank = card.bank || "";
  const isCredit = card.type === "credit";
  const isConnected = Boolean(card.provider);

  return (
    <div
      className="relative rounded-2xl p-5 text-white shadow-lg overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}1A 0%, ${color} 100%)`,
        borderColor: color,
      }}
    >
      <div className="absolute top-4 right-4 opacity-20">
        {brandIcons[brand] || "💳"}
      </div>
      <div
        className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-5"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium opacity-80 uppercase">
            {isCredit ? "Credit" : "Debit"} Card
          </span>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">
                <Link2 size={10} /> Live
              </span>
            )}
            {card.is_default && (
              <Star size={14} className="text-yellow-300 fill-current" />
            )}
          </div>
        </div>

        <div className="text-2xl font-bold mb-1">{displayName}</div>

        {bank && <div className="text-sm opacity-80 mb-3">{bank}</div>}

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs opacity-60 mb-1">Card number</div>
            <div className="font-mono text-lg tracking-wider">
              •••• •••• •••• {lastFour}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-60 mb-1">Brand</div>
            <div className="font-medium">{brand}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Cards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await api.get(API_PATHS.CARDS.LIST);
      setCards(res.data);
    } catch {
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const onEdit = (c) => {
    setEditing(c);
    setModalOpen(true);
  };

  const onCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onDelete = async (id) => {
    if (
      !confirm("Delete this card? Transactions linked to it will be unlinked.")
    )
      return;
    try {
      await api.delete(API_PATHS.CARDS.DELETE(id));
      toast.success("Card deleted");
      fetchCards();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const onSaved = () => {
    setModalOpen(false);
    fetchCards();
  };

  const connectProvider = async (provider) => {
    setConnecting(true);
    try {
      const res = await api.get(API_PATHS.ACCOUNTS.LINK(provider));
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        toast.error("Could not generate link URL");
        setConnecting(false);
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.details?.message ||
        err.message ||
        "Unable to connect card.";
      toast.error(message);
      setConnecting(false);
    }
  };

  const setDefault = async (id) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    try {
      await api.put(API_PATHS.CARDS.UPDATE(id), {
        name: card.name,
        type: card.type,
        bank: card.bank,
        brand: card.brand,
        lastFour: card.last_four,
        color: card.color,
        isDefault: true,
      });
      toast.success("Default card updated");
      fetchCards();
    } catch {
      toast.error("Failed to update default card");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Cards
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage your payment cards — credit and debit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setConnectOpen(true)}>
            <Link2 size={16} /> Connect Card
          </Button>
          <Button onClick={onCreate}>
            <Plus size={16} /> Add Card
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards yet"
          description="Add a card to start tracking which payment method you use for transactions."
          action={
            <Button onClick={onCreate}>
              <Plus size={16} /> Add Card
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <CardPreview card={card} />
              </div>

              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  {card.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                      <Star
                        size={12}
                        className="text-yellow-400 fill-current"
                      />
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!card.is_default && (
                    <button
                      onClick={() => setDefault(card.id)}
                      title="Set as default"
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(card)}
                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(card.id)}
                    className="p-1.5 hover:bg-rose-50 rounded-md text-rose-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Card" : "New Card"}
      >
        <CardForm
          initial={editing}
          onSaved={onSaved}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect a Card"
      >
        <p className="text-sm text-slate-500 mb-4">
          Securely link your card from a supported bank. You'll be redirected to
          the bank to authorize access.
        </p>
        <div className="space-y-3">
          {CONNECT_PROVIDERS.map((p) => (
            <button
              key={p.provider}
              onClick={() => connectProvider(p.provider)}
              disabled={connecting}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Landmark size={18} className="text-violet-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.country === "EU" ? "European Union" : "Georgia"}
                  </div>
                </div>
              </div>
              {connecting ? (
                <Spinner />
              ) : (
                <Link2 size={16} className="text-slate-400" />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Cards;
