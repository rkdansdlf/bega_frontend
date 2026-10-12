import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { createViewerScopedStateStorage } from '../utils/viewerScopedDraftStorage';

export interface PendingDiaryDraft {
  date: string | null;
  gameId?: number;
  stadium?: string;
  team?: string;
  section?: string;
  block?: string;
  seatRow?: string;
  seatNumber?: string;
}

interface DiaryState {
  viewerId: number | null;
  pendingDraft: PendingDiaryDraft | null;
}

interface DiaryActions {
  setPendingDraft: (draft: PendingDiaryDraft) => void;
  clearPendingDraft: () => void;
  setViewerId: (viewerId: number | null) => void;
  reset: () => void;
}

type DiaryStore = DiaryState & DiaryActions;

const getInitialState = (viewerId: number | null = null): DiaryState => ({
  viewerId,
  pendingDraft: null,
});

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setPendingDraft: (pendingDraft) => set({ pendingDraft }),
      clearPendingDraft: () => set((state) => ({
        viewerId: state.viewerId,
        pendingDraft: null,
      })),
      setViewerId: (viewerId) => set((state) => (
        state.viewerId === viewerId ? state : getInitialState(viewerId)
      )),
      reset: () => set(getInitialState()),
    }),
    {
      name: 'diary-draft-storage',
      storage: createJSONStorage(() => createViewerScopedStateStorage(
        () => useAuthStore.getState().user?.id ?? null,
        () => window.sessionStorage,
      )),
      partialize: (state) => ({
        viewerId: state.viewerId,
        pendingDraft: state.pendingDraft,
      }),
      merge: (persistedState, currentState) => {
        const viewerId = useAuthStore.getState().user?.id ?? null;
        const persisted = persistedState as Partial<DiaryState> | undefined;
        if (viewerId === null || persisted?.viewerId !== viewerId) {
          return { ...currentState, ...getInitialState(viewerId) };
        }
        return {
          ...currentState,
          ...persisted,
          viewerId,
        };
      },
    }
  )
);
