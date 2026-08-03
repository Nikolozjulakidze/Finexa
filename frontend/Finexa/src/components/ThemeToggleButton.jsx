import { useContext } from "react";
import { Sun, Moon } from "lucide-react";
import { ThemeContext } from "../context/ThemeContext";

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="relative h-10 w-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-alt hover:text-text-primary transition"
      title={theme === "light" ? "Enable dark mode" : "Enable light mode"}
    >
      <div className="relative flex items-center justify-center">
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </div>
    </button>
  );
};

export default ThemeToggleButton;
