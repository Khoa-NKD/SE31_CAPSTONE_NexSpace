import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OrganizerWorkspace, WorkspaceStatus } from '../types';
import { INITIAL_MOCK_WORKSPACES } from '../data/mock-workspaces';

const STORAGE_KEY = 'nexspace_organizer_workspaces_v1';

export interface WorkspacesStore {
  workspaces: OrganizerWorkspace[];
  getWorkspaceById: (id: string) => OrganizerWorkspace | undefined;
  updateWorkspaceStatus: (id: string, status: WorkspaceStatus) => void;
  updateWorkspaceSettings: (id: string, settings: Partial<OrganizerWorkspace>) => void;
  syncWorkspaces: (serverWorkspaces: OrganizerWorkspace[]) => void;
  resetWorkspaces: () => void;
}

export const useWorkspacesStore = create<WorkspacesStore>()(
  persist(
    (set, get) => ({
      workspaces: INITIAL_MOCK_WORKSPACES,

      getWorkspaceById: (id: string) => {
        return get().workspaces.find((w) => w.id === id) || get().workspaces[0];
      },

      updateWorkspaceStatus: (id: string, status: WorkspaceStatus) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id
              ? {
                  ...w,
                  status,
                  isLive: status === 'ACTIVE',
                  lastStatusChange: new Date().toISOString()
                }
              : w
          )
        })),

      updateWorkspaceSettings: (id: string, settings: Partial<OrganizerWorkspace>) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...settings } : w
          )
        })),

      syncWorkspaces: (serverWorkspaces: OrganizerWorkspace[]) =>
        set((state) => {
          const serverMap = new Map<string, OrganizerWorkspace>();
          for (const sw of serverWorkspaces) {
            serverMap.set(sw.id, sw);
          }

          const result: OrganizerWorkspace[] = serverWorkspaces.slice();

          // Non-destructively preserve any local drafts from O05-O15 not yet on server
          for (const local of state.workspaces) {
            const isRepresentedOnServer =
              serverMap.has(local.id) ||
              (local.id === 'ws-sg-prime-01' && serverMap.has('WS-104')) ||
              (local.id === 'ws-landmark-bt-02' && serverMap.has('WS-128')) ||
              (local.id === 'ws-tech-d7-03' && serverMap.has('WS-135')) ||
              (local.id === 'ws-capital-d3-04' && serverMap.has('WS-142'));

            if (!isRepresentedOnServer && local.status === 'DRAFT') {
              result.push(local);
            }
          }

          return { workspaces: result };
        }),

      resetWorkspaces: () =>
        set(() => ({
          workspaces: INITIAL_MOCK_WORKSPACES
        }))
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persistedState: unknown, currentState: WorkspacesStore) => {
        const p = persistedState as Partial<WorkspacesStore> | undefined;
        if (!p || !Array.isArray(p.workspaces) || p.workspaces.length === 0) {
          return currentState;
        }
        return {
          ...currentState,
          workspaces: p.workspaces
        };
      }
    }
  )
);
