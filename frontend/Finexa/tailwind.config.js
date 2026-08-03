/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "card-background": "var(--surface)",
        "border-color": "var(--border)",
        "border-hover": "var(--border-hover)",
        "sidebar-background": "var(--sidebar-bg)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-bg": "var(--accent-bg)",
        income: "var(--income)",
        expense: "var(--expense)",
        warning: "var(--warning)",
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(15, 23, 42, 0.05)",
        "soft-dark": "0 4px 20px rgba(2, 6, 23, 0.4)",
        card: "0 4px 6px rgba(15, 23, 42, 0.03)",
        "card-dark": "0 4px 6px rgba(2, 6, 23, 0.3)",
      },
      transitionProperty: {
        colors:
          "color, background-color, border-color, text-decoration-color, fill, stroke",
      },
    },
  },
  plugins: [],
};
