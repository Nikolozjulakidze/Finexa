const styles = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  warning: "bg-warning/10 text-warning",
  info: "bg-blue-500/10 text-blue-500",
  critical: "bg-rose-500/10 text-rose-500",
  neutral: "bg-surface-alt text-text-secondary",
};

const StatusPill = ({ variant = "neutral", children }) => {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${styles[variant] || styles.neutral}`}
    >
      {children}
    </span>
  );
};

export default StatusPill;
