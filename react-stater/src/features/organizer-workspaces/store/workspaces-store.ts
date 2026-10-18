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
