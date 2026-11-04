import type { QueryClient } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { createServerFn } from '@tanstack/react-start';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ActiveThemeProvider } from '@/components/themes/active-theme';
import ThemeProvider from '@/components/themes/theme-provider';
import { DEFAULT_THEME, THEMES } from '@/components/themes/theme.config';
import { seo } from '@/lib/seo';
import { LanguageProvider } from '@/features/landing/context/language-context';
import { CurrencyProvider } from '@/features/landing/context/currency-context';

import appCss from '@/styles/globals.css?url';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};

const getActiveTheme = createServerFn({ method: 'GET' })
  .validator((d: { pathname?: string } | undefined) => d)
  .handler(async ({ data }) => {
    let pathname = data?.pathname;
    let cookieValue: string | null = null;
    const isAdmin = pathname ? pathname.startsWith('/dashboard') : false;
    const cookieName = isAdmin ? 'admin_active_theme' : 'active_theme';

    // 1. Try server-side resolution via TanStack Start server helpers
    try {
      const serverModule = await import('@tanstack/react-start/server');
      if (!pathname && typeof serverModule?.getRequestUrl === 'function') {
        const reqUrl = serverModule.getRequestUrl();
        if (reqUrl) {
          pathname = new URL(reqUrl).pathname;
        }
      }
      if (typeof serverModule?.getCookie === 'function') {
        const val = serverModule.getCookie(cookieName);
        if (val) cookieValue = val;
      }
    } catch {
      // Ignore server-only import failures in browser/client environment
    }

    // 2. Client-side browser fallback (during client hydration or SPA navigation)
    if (!cookieValue && typeof document !== 'undefined') {
      try {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + cookieName + '=([^;]*)'));
        if (match?.[2]) {
          cookieValue = decodeURIComponent(match[2]);
        }
      } catch {}
    }

    if (cookieValue) {
      const isValid = THEMES.some((t) => t.value === cookieValue);
      if (isValid) return cookieValue;
    }
    return DEFAULT_THEME;
  });

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: META_THEME_COLORS.light },
      ...seo()
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap'
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/favicon.svg' }
    ]
  }),
  loader: async ({ location }) => {
    const activeTheme = await getActiveTheme({ data: { pathname: location.pathname } });
    return { activeTheme };
  },
  component: RootDocument
});

function RootDocument() {
  const { activeTheme } = Route.useLoaderData();

  return (
    <html lang='en' suppressHydrationWarning data-theme={activeTheme}>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pathname = window.location.pathname;
                  var isAdmin = pathname.startsWith('/dashboard');
                  
                  // 1. Resolve Mode (Dark / Light)
                  var modeKey = isAdmin ? 'admin_theme' : 'theme';
                  var storedMode = localStorage.getItem(modeKey);
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = storedMode === 'dark' || (storedMode === 'system' && prefersDark) || (!storedMode && prefersDark && !isAdmin);
                  
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '${META_THEME_COLORS.dark}');
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '${META_THEME_COLORS.light}');
                  }
                  
                  // 2. Resolve Palette
                  var cookieName = isAdmin ? 'admin_active_theme' : 'active_theme';
                  var match = document.cookie.match(new RegExp('(^|;\\\\s*)' + cookieName + '=([^;]*)'));
                  var cookieVal = match ? decodeURIComponent(match[2]) : null;
                  var storageVal = localStorage.getItem(cookieName);
                  var palette = storageVal || cookieVal || '${DEFAULT_THEME}';
                  if (palette) {
                    root.setAttribute('data-theme', palette);
                  }
                } catch (_) {}
              })();
            `
          }}
        />
      </head>
      <body className='bg-background overflow-x-hidden overscroll-none font-sans antialiased'>
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <ActiveThemeProvider initialTheme={activeTheme}>
            <LanguageProvider>
              <CurrencyProvider>
                <TooltipProvider>
                  <Toaster />
                  <Outlet />
                </TooltipProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </ActiveThemeProvider>
        </ThemeProvider>
        <TanStackRouterDevtools position='bottom-left' />
        <Scripts />
      </body>
    </html>
  );
}
