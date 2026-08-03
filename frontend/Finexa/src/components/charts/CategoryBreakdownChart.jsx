import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatCurrency } from "../../utils/format.js";
import CustomTooltip from "./CustomTooltip.jsx";

const GRADIENTS = [
  { id: "cat-blue", from: "#60A5FA", to: "#2563EB", solid: "#2563EB" },
  { id: "cat-emerald", from: "#34D399", to: "#10B981", solid: "#10B981" },
  { id: "cat-amber", from: "#FBBF24", to: "#F59E0B", solid: "#F59E0B" },
  { id: "cat-rose", from: "#FB7185", to: "#EF4444", solid: "#EF4444" },
  { id: "cat-indigo", from: "#A78BFA", to: "#7C3AED", solid: "#7C3AED" },
  { id: "cat-cyan", from: "#06B6D4", to: "#08B48F", solid: "#08B48F" },
];

const CategoryBreakdownChart = ({ data, currency }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-text-secondary">
        No expenses yet
      </div>
    );
  }

  const top = data.slice(0, 5);
  const formatted = top.map((d, i) => {
    const g = GRADIENTS[i % GRADIENTS.length];
    return {
      name: d.category_name,
      value: parseFloat(d.total),
      gradientId: g.id,
      solid: g.solid,
    };
  });

  return (
    <div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {GRADIENTS.map((g) => (
                <linearGradient
                  key={g.id}
                  id={g.id}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={g.from} />
                  <stop offset="100%" stopColor={g.to} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={formatted}
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {formatted.map((entry) => (
                <Cell key={entry.name} fill={`url(#${entry.gradientId})`} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip currency={currency} />}
              formatter={(v) => formatCurrency(v, currency)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2">
        {formatted.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: c.solid }}
              />
              <span className="text-xs text-text-secondary truncate">
                {c.name}
              </span>
            </div>
            <span className="text-xs font-medium text-text-primary shrink-0 ml-2">
              {formatCurrency(c.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryBreakdownChart;
