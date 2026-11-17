import * as React from 'react';
import { useLocation } from '@tanstack/react-router';
import {
  ThemeScope,
  getThemeScope,
  THEME_KEYS,
  isValidMode,
  getStoredMode,
  setStoredMode,
  getSystemTheme,
  applyThemeMode,
  disableTransitionsTemporarily
} from './theme-scope';

export interface UseThemeProps {
  theme: 'light' | 'dark' | 'system' | undefined;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resolvedTheme: 'light' | 'dark' | undefined;
  themes: string[];
  systemTheme: 'light' | 'dark' | undefined;
  scope: ThemeScope;
}

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);

export function useTheme(): UseThemeProps {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
}

export default function ThemeProvider({
  children,
  disableTransitionOnChange = true
}: ThemeProviderProps) {
  const { pathname } = useLocation();
  const activeScope = getThemeScope(pathname);

  const [adminMode, setAdminMode] = React.useState<'light' | 'dark' | 'system'>(() =>
    getStoredMode('admin')
  );
  const [customerMode, setCustomerMode] = React.useState<'light' | 'dark' | 'system'>(() =>
    getStoredMode('customer')
  );
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>(() => getSystemTheme());

  // Listen to system preference changes
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setSystemTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // Calculate active & resolved theme
  const currentMode = activeScope === 'admin' ? adminMode : customerMode;
  const resolvedTheme: 'light' | 'dark' =
    currentMode === 'system' ? systemTheme : currentMode;

  // Apply theme to DOM whenever resolvedTheme changes
  React.useEffect(() => {
    applyThemeMode(resolvedTheme);
  }, [resolvedTheme]);

  // Handle route-level scope transition
  const prevScopeRef = React.useRef(activeScope);
  React.useEffect(() => {
    if (prevScopeRef.current !== activeScope) {
      prevScopeRef.current = activeScope;
      const reenableTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : () => {};
      applyThemeMode(resolvedTheme);
      reenableTransitions();
    }
  }, [activeScope, resolvedTheme, disableTransitionOnChange]);

  // Scoped setTheme function
  const setTheme = React.useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      if (!isValidMode(newTheme)) return;
      if (activeScope === 'admin') {
        setAdminMode(newTheme);
        setStoredMode('admin', newTheme);
      } else {
        setCustomerMode(newTheme);
        setStoredMode('customer', newTheme);
      }
    },
    [activeScope]
  );

  // Cross-tab synchronization via storage event
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEYS.admin.modeKey && e.newValue && isValidMode(e.newValue)) {
        setAdminMode(e.newValue);
      } else if (e.key === THEME_KEYS.customer.modeKey && e.newValue && isValidMode(e.newValue)) {
        setCustomerMode(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = React.useMemo<UseThemeProps>(
    () => ({
      theme: currentMode,
      setTheme,
      resolvedTheme,
      themes: ['light', 'dark', 'system'],
      systemTheme,
      scope: activeScope
    }),
    [currentMode, setTheme, resolvedTheme, systemTheme, activeScope]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
