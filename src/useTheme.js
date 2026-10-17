import { useState, useEffect, useCallback } from "react";

const THEME_STORAGE_KEY = "privatelink_theme";

/**
 * Custom hook to manage PrivateLink dual theme system (Dark Charcoal & Light Ivory/Beige).
 * Synchronizes with document.documentElement[data-theme] and localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "dark";

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        return stored;
      }
      // System preference fallback
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
      }
    } catch {
      // Ignore localStorage errors (e.g., iframe sandboxes or security restrictions)
    }

    return "dark";
  });

  // Keep DOM attribute synchronized
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Listen for OS system theme changes if user hasn't set an explicit preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (e) => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        // Only react to OS changes if user hasn't explicitly set a preference
        if (!stored) {
          setThemeState(e.matches ? "light" : "dark");
        }
      } catch {
        setThemeState(e.matches ? "light" : "dark");
      }
    };

    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setThemeState(newTheme);
    }
  }, []);

  return { theme, toggleTheme, setTheme, isLight: theme === "light" };
}

export default useTheme;
