const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-4 shadow-soft">
          <Icon size={24} className="text-white" />
        </div>
      )}
      <h3 className="font-semibold text-text-primary mb-1 text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
