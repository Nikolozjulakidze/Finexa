import { useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/axios.js";
import { API_PATHS } from "../utils/apiPaths.js";
import { BANKS, CARD_BRANDS, CARD_TYPES, CARD_COLORS } from "../utils/banks.js";
import Input from "./ui/Input.jsx";
import Select from "./ui/Select.jsx";
import Button from "./ui/Button.jsx";

const CardForm = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState({
    name: initial?.name || "",
    type: initial?.type || "debit",
    bank: initial?.bank || "",
    brand: initial?.brand || "",
    lastFour: initial?.last_four || "",
    color: initial?.color || "#6366F1",
    isDefault: initial?.is_default || false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        bank: form.bank || null,
        brand: form.brand || null,
        lastFour: form.lastFour || null,
        color: form.color,
        isDefault: form.isDefault,
      };
      if (initial) {
        await api.put(API_PATHS.CARDS.UPDATE(initial.id), payload);
        toast.success("Card updated");
      } else {
        await api.post(API_PATHS.CARDS.CREATE, payload);
        toast.success("Card added");
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
      <Input
        label="Card Name"
        placeholder="e.g. Personal Visa, Work Card"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <Select
        label="Type"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        {CARD_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      <Select
        label="Bank"
        value={form.bank}
        onChange={(e) => setForm({ ...form, bank: e.target.value })}
      >
        <option value="">Select a bank</option>
        <optgroup label="Georgian Banks">
          {BANKS.filter((b) => b.country === "GE").map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="International Banks">
          {BANKS.filter((b) => b.country !== "GE").map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </optgroup>
      </Select>

      <Select
        label="Brand"
        value={form.brand}
        onChange={(e) => setForm({ ...form, brand: e.target.value })}
      >
        <option value="">Select a brand</option>
        {CARD_BRANDS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Select>

      <Input
        label="Last 4 Digits"
        placeholder="e.g. 4242"
        maxLength={4}
        value={form.lastFour}
        onChange={(e) =>
          setForm({
            ...form,
            lastFour: e.target.value.replace(/\D/g, "").slice(0, 4),
          })
        }
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Card Color
        </label>
        <div className="flex flex-wrap gap-2">
          {CARD_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm({ ...form, color })}
              className={`h-8 w-8 rounded-full transition ring-offset-2 ${
                form.color === color ? "ring-2 ring-slate-900" : "ring-0"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        <label htmlFor="isDefault" className="text-sm text-slate-700">
          Set as default card
        </label>
      </div>

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

export default CardForm;
