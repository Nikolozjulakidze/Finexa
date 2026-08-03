import { useEffect } from "react";
import { X } from "lucide-react";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const Modal = ({ open, onClose, title, children, size = "md" }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-surface rounded-2xl shadow-strong w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-fadeIn`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-color shrink-0">
          <h2 className="font-semibold text-text-primary text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-alt rounded-lg text-text-secondary transition"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
