import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { workspaceService } from '../api/service';
import type {
  SavedSearchFilterItem,
  SavedSearchCriteria,
  CreateSavedSearchFilterPayload
} from '../api/types';

const GUEST_SAVED_SEARCHES_KEY = 'nexspace_guest_saved_searches_v1';
const MAX_SAVED_FILTERS = 20;

export function useSavedSearches() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Guest state
  const [guestFilters, setGuestFilters] = useState<SavedSearchFilterItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(GUEST_SAVED_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync guest filters whenever window storage changes (e.g. across tabs)
  useEffect(() => {
    if (typeof window === 'undefined' || isAuthenticated) return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GUEST_SAVED_SEARCHES_KEY) {
        try {
          setGuestFilters(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {
          // ignore parsing error
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated]);

  // Authenticated query
  const {
    data: serverFilters,
    isLoading: isServerLoading,
    refetch: refetchServerFilters
  } = useQuery({
    queryKey: ['customer-saved-searches'],
    queryFn: () => workspaceService.getSavedSearches(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000
  });

  // Authenticated save mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateSavedSearchFilterPayload) =>
      workspaceService.createSavedSearch(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-saved-searches'] });
      toast.success(`Đã lưu bộ lọc "${data.name}" vào tài khoản`);
    },
    onError: (err: any) => {
      const msg = err?.message || 'Không thể lưu bộ lọc. Vui lòng thử lại sau.';
      toast.error(msg);
    }
  });

  // Authenticated delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => workspaceService.deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-saved-searches'] });
      toast.success('Đã xóa bộ lọc tìm kiếm');
    },
    onError: (err: any) => {
      const msg = err?.message || 'Không thể xóa bộ lọc. Vui lòng thử lại sau.';
      toast.error(msg);
    }
  });

  // Unified save filter function
  const saveFilter = useCallback(
    async (name: string, criteria: SavedSearchCriteria): Promise<SavedSearchFilterItem | null> => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error('Vui lòng nhập tên cho bộ lọc');
        return null;
      }

      if (isAuthenticated) {
        try {
          return await createMutation.mutateAsync({ name: trimmedName, criteria });
        } catch {
          return null;
        }
      } else {
        // Guest localStorage mode
        if (guestFilters.some((f) => f.name.toLowerCase() === trimmedName.toLowerCase())) {
          toast.error(`Bạn đã có bộ lọc mang tên "${trimmedName}"`);
          return null;
        }

        if (guestFilters.length >= MAX_SAVED_FILTERS) {
          toast.error(`Bạn chỉ có thể lưu tối đa ${MAX_SAVED_FILTERS} bộ lọc`);
          return null;
        }

        const newFilter: SavedSearchFilterItem = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: trimmedName,
          criteria,
          createdAt: new Date().toISOString()
        };

        const updated = [newFilter, ...guestFilters];
        setGuestFilters(updated);
        try {
          localStorage.setItem(GUEST_SAVED_SEARCHES_KEY, JSON.stringify(updated));
          toast.success(`Đã lưu bộ lọc "${trimmedName}" trên trình duyệt này`);
        } catch (e) {
          toast.error('Không thể lưu vào bộ nhớ trình duyệt');
        }
        return newFilter;
      }
    },
    [isAuthenticated, createMutation, guestFilters]
  );

  // Unified delete filter function
  const deleteFilter = useCallback(
    async (id: string | number) => {
      if (isAuthenticated) {
        await deleteMutation.mutateAsync(id);
      } else {
        const updated = guestFilters.filter((f) => f.id !== id);
        setGuestFilters(updated);
        try {
          localStorage.setItem(GUEST_SAVED_SEARCHES_KEY, JSON.stringify(updated));
          toast.success('Đã xóa bộ lọc tìm kiếm');
        } catch {
          // ignore
        }
      }
    },
    [isAuthenticated, deleteMutation, guestFilters]
  );

  const savedSearches: SavedSearchFilterItem[] = isAuthenticated
    ? (serverFilters ?? [])
    : guestFilters;

  const isLoading = isAuthenticated ? isServerLoading : false;
  const isSaving = createMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return {
    savedSearches,
    isLoading,
    isSaving,
    isDeleting,
    isAuthenticated,
    saveFilter,
    deleteFilter,
    refetchServerFilters
  };
}

