// ═══════════════════════════════════════════════════════
// SENPAY Global Theme Provider & Token Engine
// Supports 'obsidian' (Obsidian Dark) and 'high-contrast' (WCAG AAA)
// ═══════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'senpay_theme';

export const THEMES = {
  OBSIDIAN: 'obsidian',
  HIGH_CONTRAST: 'high-contrast',
};

const ThemeContext = createContext({
  theme: THEMES.OBSIDIAN,
  setTheme: () => {},
  isHighContrast: false,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === THEMES.OBSIDIAN || saved === THEMES.HIGH_CONTRAST)) {
          return saved;
        }
      } catch {
        // Local storage inaccessible
      }
    }
    return THEMES.OBSIDIAN;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      if (theme === THEMES.HIGH_CONTRAST) {
        root.classList.add('theme-high-contrast');
      } else {
        root.classList.remove('theme-high-contrast');
      }
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.OBSIDIAN || newTheme === THEMES.HIGH_CONTRAST) {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isHighContrast: theme === THEMES.HIGH_CONTRAST,
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
