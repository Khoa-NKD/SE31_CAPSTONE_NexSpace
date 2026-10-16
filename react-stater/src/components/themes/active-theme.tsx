import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef
} from 'react';
import { useLocation } from '@tanstack/react-router';
import {
  ThemeScope,
  getThemeScope,
  THEME_KEYS,
  isValidTheme,
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
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const { pathname } = useLocation();
  const activeScope = getThemeScope(pathname);

  // Initialize scoped palettes: on client prefer localStorage; on server/initial SSR use initialTheme
  const [adminPalette, setAdminPalette] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredPalette('admin');
      if (stored) return stored;
    }
    if (activeScope === 'admin' && initialTheme && isValidTheme(initialTheme)) {
      return initialTheme;
    }
    return getStoredPalette('admin');
  });

  const [customerPalette, setCustomerPalette] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredPalette('customer');
      if (stored) return stored;
    }
    if (activeScope === 'customer' && initialTheme && isValidTheme(initialTheme)) {
      return initialTheme;
    }
    return getStoredPalette('customer');
  });


  const activeTheme = activeScope === 'admin' ? adminPalette : customerPalette;

  // Apply palette to DOM whenever activeTheme changes
  useEffect(() => {
    applyPalette(activeTheme);
  }, [activeTheme]);

  // Handle route-level scope transition
  const prevScopeRef = useRef(activeScope);
  useEffect(() => {
    if (prevScopeRef.current !== activeScope) {
      prevScopeRef.current = activeScope;
      applyPalette(activeTheme);
    }
  }, [activeScope, activeTheme]);

  // Scoped setActiveTheme
  const setActiveTheme = useCallback(
    (newTheme: string) => {
      if (!isValidTheme(newTheme)) return;
      if (activeScope === 'admin') {
        setAdminPalette(newTheme);
        setStoredPalette('admin', newTheme);
      } else {
        setCustomerPalette(newTheme);
        setStoredPalette('customer', newTheme);
      }
    },
    [activeScope]
  );

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === THEME_KEYS.admin.paletteStorageKey &&
        e.newValue &&
        isValidTheme(e.newValue)
      ) {
        setAdminPalette(e.newValue);
      } else if (
        e.key === THEME_KEYS.customer.paletteStorageKey &&
        e.newValue &&
        isValidTheme(e.newValue)
      ) {
        setCustomerPalette(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      activeTheme,
      setActiveTheme,
      adminTheme: adminPalette,
      customerTheme: customerPalette,
      scope: activeScope
    }),
    [activeTheme, setActiveTheme, adminPalette, customerPalette, activeScope]
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
