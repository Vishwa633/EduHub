import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const getStorage = () => {
  // Expo web renders on the server first; AsyncStorage is client-only.
  if (typeof window === 'undefined') return noopStorage;
  return AsyncStorage;
};

const normalizeFavoriteIds = (ids) => {
  if (!Array.isArray(ids)) return [];

  return Array.from(
    new Set(
      ids
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  );
};

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favoriteTutorIds: [],
      isHydrated: false,

      setHydrated: (value) => set({ isHydrated: Boolean(value) }),

      isFavorite: (tutorId) => {
        const normalizedId = String(tutorId || '').trim();
        if (!normalizedId) return false;
        return get().favoriteTutorIds.includes(normalizedId);
      },

      toggleFavorite: (tutorId) => {
        const normalizedId = String(tutorId || '').trim();
        if (!normalizedId) return;

        set((state) => {
          const exists = state.favoriteTutorIds.includes(normalizedId);
          const next = exists
            ? state.favoriteTutorIds.filter((id) => id !== normalizedId)
            : [...state.favoriteTutorIds, normalizedId];

          return { favoriteTutorIds: normalizeFavoriteIds(next) };
        });
      },

      clearFavorites: () => set({ favoriteTutorIds: [] }),
    }),
    {
      name: 'favorite-tutors-storage',
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({ favoriteTutorIds: state.favoriteTutorIds }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate favorites:', error);
        }

        state?.setHydrated(true);
      },
    }
  )
);
