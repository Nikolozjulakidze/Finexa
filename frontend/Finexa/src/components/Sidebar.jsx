import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Folder,
  Target,
  Sparkles,
  MessageSquare,
  Wallet,
  CreditCard,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import FinexaLogo from "./FinexaLogo.jsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/categories", label: "Categories", icon: Folder },
  { to: "/budgets", label: "Budgets", icon: Target },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/bank-connections", label: "Accounts", icon: Wallet },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/ai-chat", label: "AI Chat", icon: MessageSquare },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <aside className="w-64 bg-sidebar-background hidden lg:flex flex-col shrink-0 p-4 card-style">
      <div className="h-16 flex items-center px-2">
        <FinexaLogo variant="horizontal" size={56} titleSize={22} />
      </div>

      <nav className="flex-1 mt-4 p-2 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
                isActive
                  ? "bg-accent text-white shadow-soft"
                  : "text-text-secondary hover:bg-surface-alt hover:text-text-primary"
              }`
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 mt-3 border-t border-border-color">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-alt transition">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate">
              {user?.name || "User"}
            </div>
            <div className="text-xs text-text-secondary truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-lg text-text-secondary hover:bg-border-color transition shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
