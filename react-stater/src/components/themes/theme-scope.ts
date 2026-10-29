import { DEFAULT_THEME, THEMES } from './theme.config';

export type ThemeScope = 'admin' | 'customer';

/**
 * Determines the theme scope based on the route pathname.
 * - `/dashboard/*` -> Admin scope
 * - All other routes (`/`, `/workspaces/*`, `/auth/*`, etc.) -> Customer scope
 */
export function getThemeScope(pathname: string): ThemeScope {
  if (pathname.startsWith('/dashboard')) {
    return 'admin';
  }
  return 'customer';
}

export const THEME_KEYS = {
  admin: {
    modeKey: 'admin_theme',
    paletteCookie: 'admin_active_theme',
    paletteStorageKey: 'admin_active_theme',
    defaultMode: 'light' as const,
    defaultPalette: DEFAULT_THEME
  },
  customer: {
    modeKey: 'theme',
    paletteCookie: 'active_theme',
    paletteStorageKey: 'active_theme',
    defaultMode: 'light' as const,
    defaultPalette: DEFAULT_THEME
  }
} as const;

export function isValidTheme(themeName: string | null | undefined): boolean {
  if (!themeName) return false;
  return THEMES.some((t) => t.value === themeName);
}

export function isValidMode(mode: string | null | undefined): mode is 'light' | 'dark' | 'system' {
  return mode === 'light' || mode === 'dark' || mode === 'system';
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax; ${isSecure ? 'Secure;' : ''}`;
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredMode(scope: ThemeScope): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return THEME_KEYS[scope].defaultMode;
  try {
    const val = localStorage.getItem(THEME_KEYS[scope].modeKey);
    if (isValidMode(val)) return val;
  } catch {}
  return THEME_KEYS[scope].defaultMode;
}

export function setStoredMode(scope: ThemeScope, mode: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_KEYS[scope].modeKey, mode);
  } catch {}
}

export function getStoredPalette(scope: ThemeScope): string {
  if (typeof window === 'undefined') return THEME_KEYS[scope].defaultPalette;
  try {
    const storageVal = localStorage.getItem(THEME_KEYS[scope].paletteStorageKey);
    if (isValidTheme(storageVal)) return storageVal!;
    const cookieVal = getCookie(THEME_KEYS[scope].paletteCookie);
    if (isValidTheme(cookieVal)) return cookieVal!;
  } catch {}
  return THEME_KEYS[scope].defaultPalette;
}

export function setStoredPalette(scope: ThemeScope, palette: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_KEYS[scope].paletteStorageKey, palette);
    setCookie(THEME_KEYS[scope].paletteCookie, palette);
  } catch {}
}

export function applyThemeMode(resolvedMode: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolvedMode === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#09090b');
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
  }
}

export function applyPalette(palette: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', palette);
  Array.from(document.body.classList)
    .filter((c) => c.startsWith('theme-'))
    .forEach((c) => document.body.classList.remove(c));
}

export function disableTransitionsTemporarily(): () => void {
  if (typeof document === 'undefined') return () => {};
  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
    )
  );
  document.head.appendChild(css);
  return () => {
    // Force reflow
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
}
