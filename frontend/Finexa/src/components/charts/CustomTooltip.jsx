import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext.jsx";
import { formatCurrency } from "../../utils/format.js";

const CustomTooltip = ({ active, payload, label, currency }) => {
  const { theme } = useContext(ThemeContext);
  if (!active || !payload || payload.length === 0) return null;

  const background = theme === "dark" ? "var(--surface)" : "#fff";
  const border = theme === "dark" ? "var(--border)" : "#e2e8f0";
  const titleColor = theme === "dark" ? "var(--text-secondary)" : "#64748b";
  const textColor = theme === "dark" ? "var(--text-primary)" : "#0f172a";
  const boxShadow =
    theme === "dark"
      ? "0 6px 24px rgba(2,6,23,0.6)"
      : "0 4px 12px rgba(107,114,128,0.15)";

  return (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        color: textColor,
        padding: 10,
        borderRadius: 8,
        boxShadow,
        fontSize: 13,
        minWidth: 120,
      }}
    >
      {label && (
        <div style={{ color: titleColor, fontSize: 11, marginBottom: 6 }}>
          {label}
        </div>
      )}
      {payload.map((p) => (
        <div
          key={p.name}
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div style={{ color: textColor }}>{p.name}</div>
          <div style={{ color: textColor, fontWeight: 600 }}>
            {formatCurrency(p.value, currency)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomTooltip;
