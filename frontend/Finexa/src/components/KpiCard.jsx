import { TrendingUp, TrendingDown } from "lucide-react";

const KpiCard = ({ label, value, delta, icon: Icon, accent = "slate" }) => {
  const hasDelta = delta != null && Number.isFinite(delta);
  const positive = hasDelta && delta >= 0;

  const accentColors = {
    violet: "bg-accent",
    blue: "bg-accent",
    emerald: "bg-emerald-500",
    orange: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
  };

  const iconBg = accentColors[accent] || accentColors.slate;

  return (
    <div className="card-style p-5 flex items-center gap-4 transition transform hover:-translate-y-0.5">
      {Icon && (
        <div
          className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          <Icon size={26} className="text-white" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-secondary truncate">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <h3 className="text-3xl font-extrabold text-text-primary tracking-tight truncate">
            {value}
          </h3>
          {hasDelta && (
            <span
              className={`text-xs font-semibold shrink-0 inline-flex items-center gap-0.5 ${
                positive ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
