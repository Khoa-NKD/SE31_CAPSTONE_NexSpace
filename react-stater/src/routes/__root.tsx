import type { QueryClient } from '@tanstack/react-query';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { createServerFn } from '@tanstack/react-start';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ActiveThemeProvider } from '@/components/themes/active-theme';
import ThemeProvider from '@/components/themes/theme-provider';
import { DEFAULT_THEME } from '@/components/themes/theme.config';
import { ORGANIZER_DASHBOARD_PATH, THEME_KEYS } from '@/components/themes/theme-scope';
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
  .handler(async () => DEFAULT_THEME);

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
  const isOrganizer = useLocation({
    select: (location) => ORGANIZER_DASHBOARD_PATH.test(location.pathname)
  });

  return (
    <html
      lang='en'
      suppressHydrationWarning
      data-theme={activeTheme}
      data-organizer-theme={isOrganizer ? '' : undefined}
    >
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pathname = window.location.pathname;
                  var isOrganizer = ${ORGANIZER_DASHBOARD_PATH}.test(pathname);
                  var isAdmin = pathname.startsWith('/dashboard') && !isOrganizer;
                  
                  // 1. Resolve Mode (Dark / Light)
                  var modeKey = isAdmin ? '${THEME_KEYS.admin.modeKey}' : '${THEME_KEYS.customer.modeKey}';
                  var storedMode = localStorage.getItem(modeKey);
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = storedMode === 'dark' || (storedMode === 'system' && prefersDark);
                  
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
                  
                  // 2. Enforce Single Vercel Palette
                  var cookieName = isAdmin ? '${THEME_KEYS.admin.paletteStorageKey}' : '${THEME_KEYS.customer.paletteStorageKey}';
                  if (localStorage.getItem(cookieName) !== '${DEFAULT_THEME}') {
                    localStorage.setItem(cookieName, '${DEFAULT_THEME}');
                  }
                  root.setAttribute('data-theme', '${DEFAULT_THEME}');
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
