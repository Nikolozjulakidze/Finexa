import { useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/axios.js";
import { API_PATHS } from "../utils/apiPaths.js";
import { todayDateString } from "../utils/format.js";
import Input from "./ui/Input.jsx";
import Select from "./ui/Select.jsx";
import Textarea from "./ui/Textarea.jsx";
import Button from "./ui/Button.jsx";

const TransactionForm = ({ initial, categories, cards, onSaved, onCancel }) => {
  const [form, setForm] = useState({
    type: initial?.type || "expense",
    amount: initial?.amount || "",
    categoryId: initial?.category_id || "",
    cardId: initial?.card_id || "",
    description: initial?.description || "",
    notes: initial?.notes || "",
    transactionDate:
      initial?.transaction_date?.split("T")[0] || todayDateString(),
  });
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const filteredCards = cards.filter((c) => c.type === form.type);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId || null,
        cardId: form.cardId || null,
        description: form.description || null,
        notes: form.notes || null,
        transactionDate: form.transactionDate,
      };
      if (initial) {
        await api.put(API_PATHS.TRANSACTIONS.UPDATE(initial.id), payload);
        toast.success("Transaction updated");
      } else {
        await api.post(API_PATHS.TRANSACTIONS.CREATE, payload);
        toast.success("Transaction added");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() =>
            setForm({ ...form, type: "expense", categoryId: "", cardId: "" })
          }
          className={`py-2 px-4 rounded-xl text-sm font-semibold transition ${
            form.type === "expense"
              ? "bg-rose-600 text-white"
              : "bg-card-background text-text-secondary hover:bg-border-color"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({ ...form, type: "income", categoryId: "", cardId: "" })
          }
          className={`py-2 px-4 rounded-xl text-sm font-semibold transition ${
            form.type === "income"
              ? "bg-emerald-600 text-white"
              : "bg-card-background text-text-secondary hover:bg-border-color"
          }`}
        >
          Income
        </button>
      </div>

      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />

      <Select
        label="Category"
        value={form.categoryId}
        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
      >
        <option value="">Uncategorized</option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      {filteredCards.length > 0 && (
        <Select
          label="Card (optional)"
          value={form.cardId}
          onChange={(e) => setForm({ ...form, cardId: e.target.value })}
        >
          <option value="">No card</option>
          {filteredCards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.last_four ? `•${c.last_four}` : ""}
            </option>
          ))}
        </Select>
      )}

      <Input
        label="Description"
        placeholder="e.g. Coffee at Starbucks"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <Input
        label="Date"
        type="date"
        required
        value={form.transactionDate}
        onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
      />

      <Textarea
        label="Notes (optional)"
        rows={3}
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
};

export default TransactionForm;
