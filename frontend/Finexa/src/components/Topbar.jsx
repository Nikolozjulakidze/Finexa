import { Bell, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggleButton from "./ThemeToggleButton.jsx";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatToday = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const Topbar = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <header className="h-20 bg-surface border-b border-border-color flex items-center justify-between px-6 shrink-0">
      <div>
        <div className="text-lg font-semibold text-text-primary tracking-tight">
          {greeting()}
          {firstName && `, ${firstName}`} 👋
        </div>
        <div className="text-xs text-text-secondary">{formatToday()}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <input
            placeholder="Search transactions, categories..."
            className="px-4 py-2 pr-10 rounded-full input-field text-sm focus-ring-accent w-80"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary">
            <Search size={16} />
          </div>
        </div>

        <ThemeToggleButton />
        <button
          title="Notifications"
          className="relative h-10 w-10 rounded-full text-text-secondary hover:bg-surface-alt hover:text-text-primary flex items-center justify-center transition"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-surface" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
