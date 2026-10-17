import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./useTheme";

export default function ThemeToggle({
  className = "",
  showLabel = false,
  theme: propTheme,
  onToggle: propToggle,
}) {
  const hookTheme = useTheme();
  const theme = propTheme || hookTheme.theme;
  const toggleTheme = propToggle || hookTheme.toggleTheme;
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={isLight ? "Switch to Dark Mode (Quadrifoglio Charcoal)" : "Switch to Light Mode (Italian Luxury Ivory & Linen Beige)"}
      aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      <div className={`theme-toggle-icon-wrap ${isLight ? "icon-rotated" : ""}`}>
        {isLight ? (
          <Moon size={14} className="theme-icon moon-icon" style={{ color: "var(--brand)" }} />
        ) : (
          <Sun size={14} className="theme-icon sun-icon" style={{ color: "#facc15" }} />
        )}
      </div>
      {showLabel && (
        <span className="theme-toggle-label">
          {isLight ? "DARK" : "LIGHT"}
        </span>
      )}
    </button>
  );
}
