const variants = {
  primary:
    "bg-accent text-white shadow-soft hover:shadow-md transition transform hover:-translate-y-0.5",
  secondary: "bg-surface-alt hover:bg-border-hover text-text-primary",
  ghost: "hover:bg-surface-alt text-text-secondary hover:text-text-primary",
  danger:
    "bg-linear-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/25",
  outline:
    "border border-border-color hover:bg-surface-alt text-text-secondary hover:text-text-primary",
  accent:
    "bg-accent text-white shadow-soft hover:shadow-md transition transform hover:-translate-y-0.5",
};

const sizes = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
