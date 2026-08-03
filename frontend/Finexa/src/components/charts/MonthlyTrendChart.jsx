import { useContext } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatMonth, formatCurrency } from "../../utils/format.js";
import { ThemeContext } from "../../context/ThemeContext.jsx";

const MonthlyTrendChart = ({ data, currency }) => {
  const { theme } = useContext(ThemeContext);

  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const tooltipBg = theme === "dark" ? "#1e293b" : "#ffffff";
  const tooltipBorder = theme === "dark" ? "#334155" : "#e2e8f0";
  const tooltipShadow =
    theme === "dark"
      ? "0 6px 24px rgba(2,6,23,0.6)"
      : "0 4px 12px rgba(107,114,128,0.15)";
  const barBg = theme === "dark" ? "#334155" : "#f1f5f9";

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-text-secondary">
        No data yet
      </div>
    );
  }

  const formatted = data.map((d) => ({
    month: formatMonth(d.month),
    income: parseFloat(d.income),
    expense: parseFloat(d.expense),
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} barCategoryGap="35%" barGap={6}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: textColor, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${tooltipBorder}`,
              backgroundColor: tooltipBg,
              boxShadow: tooltipShadow,
              fontSize: 12,
            }}
            formatter={(value) => formatCurrency(value, currency)}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12, color: textColor }}
            iconType="circle"
            payload={[
              { value: "income", type: "circle", color: "#10B981" },
              { value: "expense", type: "circle", color: "#EF4444" },
            ]}
          />
          <Bar
            dataKey="income"
            fill="url(#incomeGradient)"
            radius={[10, 10, 10, 10]}
            background={{ fill: barBg, radius: 10 }}
          />
          <Bar
            dataKey="expense"
            fill="url(#expenseGradient)"
            radius={[10, 10, 10, 10]}
            background={{ fill: barBg, radius: 10 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyTrendChart;
