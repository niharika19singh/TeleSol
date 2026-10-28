// ═════════════════════════════════════════════════════════════════
// SENPAY Global Theme Provider & Token Engine
// Exactly Two Themes: Light (Porcelain) & Dark (Obsidian)
// Single Source of Truth for Centralized Design System
// ═════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'senpay_theme';

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

const ThemeContext = createContext({
  theme: THEMES.DARK,
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
  isLight: false,
  isHighContrast: false,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === THEMES.LIGHT || saved === THEMES.DARK) {
          return saved;
        }
        // Migrate legacy theme keys
        if (saved === 'high-contrast' || saved === 'obsidian') {
          return THEMES.DARK;
        }
      } catch {
        // Local storage inaccessible
      }
    }
    return THEMES.DARK;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      if (theme === THEMES.LIGHT) {
        root.classList.add('theme-light');
        root.classList.remove('theme-dark', 'theme-high-contrast');
      } else {
        root.classList.add('theme-dark');
        root.classList.remove('theme-light', 'theme-high-contrast');
      }
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.LIGHT || newTheme === THEMES.DARK) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === THEMES.DARK,
        isLight: theme === THEMES.LIGHT,
        isHighContrast: false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
