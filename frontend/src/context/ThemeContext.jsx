import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "oryn-theme";
const THEME_CYCLE = ["dark", "light", "sepia"];

// theme: "dark" | "light" | "sepia" (drives epub.js rendition themes + body class)
// pdfInverted: separate flag for the PDF invert-colour toggle you described
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || "dark");
  const [pdfInverted, setPdfInverted] = useState(false);

  useEffect(() => {
    document.body.classList.remove(...THEME_CYCLE);
    document.body.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((t) => THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, pdfInverted, setPdfInverted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
