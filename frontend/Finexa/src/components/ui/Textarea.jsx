const Textarea = ({ label, error, className = "", ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 input-field text-sm focus-ring-accent resize-y min-h-[80px] ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

export default Textarea;
