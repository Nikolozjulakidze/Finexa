import { useContext } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "../../utils/format.js";
import { ThemeContext } from "../../context/ThemeContext.jsx";
import CustomTooltip from "./CustomTooltip.jsx";

const TransactionTrendChart = ({ data, currency, interval = 3 }) => {
  const { theme } = useContext(ThemeContext);

  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const cursorFill =
    theme === "dark" ? "rgba(248,250,252,0.02)" : "rgba(203,213,225,0.5)";
  const cursorStroke = theme === "dark" ? "rgba(255,255,255,0.04)" : "#cbd5e1";

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-text-secondary">
        No data yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB923C" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#FB923C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={interval}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={{
              fill: cursorFill,
              stroke: cursorStroke,
              strokeDasharray: "3 3",
            }}
            content={<CustomTooltip currency={currency} />}
            formatter={(v) => formatCurrency(v, currency)}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12, color: textColor }}
            iconType="circle"
            payload={[
              { value: "income", type: "circle", color: "#10B981" },
              { value: "expense", type: "circle", color: "#EF4444" },
            ]}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#incomeArea)"
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#EF4444"
            strokeWidth={2.5}
            fill="url(#expenseArea)"
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TransactionTrendChart;
