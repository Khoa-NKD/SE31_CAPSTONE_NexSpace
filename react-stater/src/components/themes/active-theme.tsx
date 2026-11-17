import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { useLocation } from '@tanstack/react-router';
import { DEFAULT_THEME } from './theme.config';
import {
  ThemeScope,
  getThemeScope,
  getStoredPalette,
  setStoredPalette,
  applyPalette
} from './theme-scope';

type ThemeContextType = {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  adminTheme: string;
  customerTheme: string;
  scope: ThemeScope;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const { pathname } = useLocation();
  const activeScope = getThemeScope(pathname);

  // Enforce single Vercel palette on mount and scope transitions, and normalize stale storage
  useEffect(() => {
    getStoredPalette(activeScope);
    applyPalette(DEFAULT_THEME);
  }, [activeScope]);

  const setActiveTheme = useCallback(
    (_newTheme: string) => {
      setStoredPalette(activeScope, DEFAULT_THEME);
      applyPalette(DEFAULT_THEME);
    },
    [activeScope]
  );

  const value = useMemo<ThemeContextType>(
    () => ({
      activeTheme: DEFAULT_THEME,
      setActiveTheme,
      adminTheme: DEFAULT_THEME,
      customerTheme: DEFAULT_THEME,
      scope: activeScope
    }),
    [setActiveTheme, activeScope]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeConfig must be used within an ActiveThemeProvider');
  }
  return context;
}
