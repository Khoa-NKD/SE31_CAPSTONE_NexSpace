import * as React from 'react';
import { useRouter, useLocation } from '@tanstack/react-router';
import { useHotkey, useHotkeySequence, type HotkeySequence } from '@tanstack/react-hotkeys';
import { useTheme } from '@/components/themes/theme-provider';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from '@/components/ui/command';
import { navGroups, organizerNavGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import { useThemeConfig } from '@/components/themes/active-theme';
import { THEMES } from '@/components/themes/theme.config';
import { useWorkspacesStore } from '@/features/organizer-workspaces/store/workspaces-store';

type CommandMenuContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
};

const CommandMenuContext = React.createContext<CommandMenuContextValue | null>(null);

/** Open/close the ⌘K command palette from anywhere in the dashboard tree. */
export function useCommandMenu() {
  const context = React.useContext(CommandMenuContext);
  if (!context) {
    throw new Error('useCommandMenu must be used within <CommandMenu>');
  }
  return context;
}

/**
 * Registers one key sequence. Rendered once per shortcut so a dynamic list of
 * nav items can each own a `useHotkeySequence` call without breaking the rules
 * of hooks (mount/unmount handles registration as the list changes).
 */
function SequenceHotkey({
  sequence,
  onTrigger
}: {
  sequence: HotkeySequence;
  onTrigger: () => void;
}) {
  useHotkeySequence(sequence, onTrigger);
  return null;
}

// Sequences owned by the global theme shortcuts. A nav item carrying the same
// combo yields to the theme toggle and is not bound or badged as a navigation sequence.
const RESERVED_SEQUENCES = new Set(['t,t', 'd,d']);
const isReserved = (shortcut?: string[]) =>
  !!shortcut?.length && RESERVED_SEQUENCES.has(shortcut.join(','));

type PaletteItem = {
  id: string;
  name: string;
  shortcut?: string[];
  url: string;
  keywords?: string[];
};

const getSearchString = (name: string, shortcut?: string[], keywords?: string[]) => {
  const shortcutJoined = shortcut?.join('') || '';
  const shortcutSpaced = shortcut?.join(' ') || '';
  const keywordsStr = keywords?.join(' ') || '';
  return `${name} ${shortcutJoined} ${shortcutSpaced} ${keywordsStr}`.trim();
};

const ORGANIZER_QUICK_ACTIONS: PaletteItem[] = [
  {
    id: 'action-create-workspace',
    name: 'Create New Workspace (O05)',
    url: '/dashboard/organizer/workspaces/create',
    shortcut: ['n', 'w'],
    keywords: ['new', 'create', 'workspace', 'o05', 'nw', 'onboarding']
  },
  {
    id: 'action-location',
    name: 'Workspace Location & Map (O06)',
    url: '/dashboard/organizer/workspaces/create/location',
    keywords: ['location', 'map', 'address', 'coordinates', 'o06', 'goong']
  },
  {
    id: 'action-hours',
    name: 'Operating Hours Setup (O07)',
    url: '/dashboard/organizer/workspaces/create/hours',
    keywords: ['hours', 'schedule', 'opening', 'closing', 'operating', 'o07']
  },
  {
    id: 'action-amenities',
    name: 'Amenities & Facilities (O08)',
    url: '/dashboard/organizer/workspaces/create/amenities',
    keywords: ['amenities', 'facilities', 'wifi', 'coffee', 'o08']
  },
  {
    id: 'action-media',
    name: 'Media Gallery & Photos (O09)',
    url: '/dashboard/organizer/workspaces/create/media',
    keywords: ['media', 'photos', 'gallery', 'images', 'cover', 'o09']
  },
  {
    id: 'action-floor-plan',
    name: 'Floor Plan & Zones Setup (O10)',
    url: '/dashboard/organizer/workspaces/create/floor-plan',
    keywords: ['floor', 'plan', 'zones', 'blueprint', 'o10', 'cad', 'svg', 'desks']
  },
  {
    id: 'action-review',
    name: 'Pre-submission Review Checklist (O15)',
    url: '/dashboard/organizer/workspaces/create/review',
    keywords: ['review', 'checklist', 'submit', 'submission', 'verification', 'o15', 'audit']
  },
  {
    id: 'action-lifecycle',
    name: 'Workspace Lifecycle Control (O16)',
    url: '/dashboard/organizer/workspaces/lifecycle',
    keywords: ['lifecycle', 'status', 'pause', 'emergency', 'maintenance', 'archive', 'o16']
  }
];

export default function CommandMenu({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { pathname } = useLocation();
  const isOrganizer = pathname.startsWith('/dashboard/organizer');

  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen((prev) => !prev), []);

  const { theme, setTheme } = useTheme();
  const { activeTheme, setActiveTheme } = useThemeConfig();
  const workspaces = useWorkspacesStore((state) => state.workspaces);

  const cycleTheme = React.useCallback(() => {
    const currentIndex = THEMES.findIndex((t) => t.value === activeTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setActiveTheme(THEMES[nextIndex].value);
  }, [activeTheme, setActiveTheme]);

  const toggleDarkLight = React.useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // Global shortcuts. react-hotkeys calls preventDefault and ignores hotkeys
  // while an input/textarea is focused by default.
  useHotkey('Mod+K', toggle);
  useHotkeySequence(['T', 'T'], cycleTheme);
  useHotkeySequence(['D', 'D'], toggleDarkLight);

  const activeNavGroups = isOrganizer ? organizerNavGroups : navGroups;
  const filteredGroups = useFilteredNavGroups(activeNavGroups);

  // Group items by category / parent title
  const sections = React.useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    const push = (section: string, item: PaletteItem) => {
      const items = map.get(section) ?? [];
      items.push(item);
      map.set(section, items);
    };

    const defaultSection = isOrganizer ? 'Organizer Console' : 'Navigation';

    for (const group of filteredGroups) {
      const groupHeading = group.label || defaultSection;
      for (const navItem of group.items) {
        if (navItem.url !== '#') {
          push(groupHeading, {
            id: navItem.title,
            name: navItem.title,
            shortcut: navItem.shortcut,
            url: navItem.url,
            keywords: [
              ...(navItem.shortcut ? [navItem.shortcut.join(''), navItem.shortcut.join(' ')] : []),
              navItem.title.toLowerCase()
            ]
          });
        }
        for (const child of navItem.items ?? []) {
          push(navItem.title, {
            id: `${navItem.title}-${child.title}`,
            name: child.title,
            shortcut: child.shortcut,
            url: child.url,
            keywords: [
              ...(child.shortcut ? [child.shortcut.join(''), child.shortcut.join(' ')] : []),
              child.title.toLowerCase()
            ]
          });
        }
      }
    }

    return [...map.entries()];
  }, [filteredGroups, isOrganizer]);

  const runAndClose = React.useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const navigateTo = React.useCallback(
    (url: string) => {
      runAndClose(() => router.navigate({ to: url }));
    },
    [router, runAndClose]
  );

  // Every nav item with a shortcut becomes a global sequence, except reserved combos
  const navSequences = React.useMemo(
    () =>
      sections
        .flatMap(([, items]) => items)
        .concat(isOrganizer ? ORGANIZER_QUICK_ACTIONS : [])
        .filter(
          (item): item is PaletteItem & { shortcut: string[] } =>
            !!item.shortcut?.length && !isReserved(item.shortcut)
        ),
    [sections, isOrganizer]
  );

  const value = React.useMemo<CommandMenuContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  );

  return (
    <CommandMenuContext.Provider value={value}>
      {children}

      {navSequences.map((item) => (
        <SequenceHotkey
          key={item.id}
          sequence={item.shortcut.map((key) => key.toUpperCase()) as HotkeySequence}
          onTrigger={() => navigateTo(item.url)}
        />
      ))}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={isOrganizer ? 'Organizer Command Palette' : 'Command Palette'}
        description={
          isOrganizer
            ? 'Search workspaces, bookings, resources, or run organizer commands'
            : 'Search for a page or run a command'
        }
      >
        <CommandInput
          placeholder={
            isOrganizer
              ? 'Type a workspace, resource or command...'
              : 'Type a command or search...'
          }
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Organizer specific: Quick Workspace Selection */}
          {isOrganizer && workspaces.length > 0 && (
            <CommandGroup heading='My Workspaces'>
              {workspaces.map((ws) => (
                <CommandItem
                  key={ws.id}
                  value={`Workspace: ${ws.name} ${ws.district} ${ws.city} ${ws.status} ${ws.id}`}
                  keywords={[ws.name, ws.district, ws.city, ws.status, 'workspace']}
                  onSelect={() =>
                    navigateTo(
                      ws.status === 'DRAFT'
                        ? '/dashboard/organizer/workspaces/create'
                        : `/dashboard/organizer/workspaces/lifecycle?id=${ws.id}`
                    )
                  }
                >
                  <div className='flex items-center justify-between w-full min-w-0 pr-1'>
                    <div className='flex flex-col min-w-0 mr-2'>
                      <span className='font-medium text-foreground truncate'>{ws.name}</span>
                      <span className='text-[11px] text-muted-foreground truncate'>
                        {ws.district}, {ws.city}
                      </span>
                    </div>
                    <span className='shrink-0 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 text-muted-foreground'>
                      {ws.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Organizer specific: Onboarding & Actions */}
          {isOrganizer && (
            <CommandGroup heading='Workspace Onboarding & Actions'>
              {ORGANIZER_QUICK_ACTIONS.map((action) => (
                <CommandItem
                  key={action.id}
                  value={getSearchString(action.name, action.shortcut, action.keywords)}
                  keywords={[
                    ...(action.shortcut ? [action.shortcut.join(''), action.shortcut.join(' ')] : []),
                    ...(action.keywords || [])
                  ]}
                  onSelect={() => navigateTo(action.url)}
                >
                  <span>{action.name}</span>
                  {action.shortcut ? (
                    <CommandShortcut>{action.shortcut.join('').toUpperCase()}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Navigation Sections */}
          {sections.map(([section, items]) => (
            <CommandGroup key={section} heading={section}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={getSearchString(item.name, item.shortcut, item.keywords)}
                  keywords={[
                    ...(item.shortcut ? [item.shortcut.join(''), item.shortcut.join(' ')] : []),
                    ...(item.keywords || [])
                  ]}
                  onSelect={() => navigateTo(item.url)}
                >
                  <span>{item.name}</span>
                  {item.shortcut?.length && !isReserved(item.shortcut) ? (
                    <CommandShortcut>{item.shortcut.join('').toUpperCase()}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {/* Global Theme Commands */}
          <CommandGroup heading='Theme'>
            <CommandItem
              value='Switch Theme TT T T theme palette color light dark'
              keywords={['TT', 'T T', 'theme', 'color', 'palette']}
              onSelect={() => runAndClose(cycleTheme)}
            >
              <span>Switch Theme</span>
              <CommandShortcut>TT</CommandShortcut>
            </CommandItem>
            <CommandItem
              value='Toggle Dark Light Mode DD D D dark light mode theme'
              keywords={['DD', 'D D', 'dark', 'light', 'mode', 'theme']}
              onSelect={() => runAndClose(toggleDarkLight)}
            >
              <span>Toggle Dark/Light Mode</span>
              <CommandShortcut>DD</CommandShortcut>
            </CommandItem>
            <CommandItem
              value='Set Light Theme light mode day bright'
              keywords={['light', 'day', 'theme']}
              onSelect={() => runAndClose(() => setTheme('light'))}
            >
              <span>Set Light Theme</span>
            </CommandItem>
            <CommandItem
              value='Set Dark Theme dark mode night dim black'
              keywords={['dark', 'night', 'theme']}
              onSelect={() => runAndClose(() => setTheme('dark'))}
            >
              <span>Set Dark Theme</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandMenuContext.Provider>
  );
}
