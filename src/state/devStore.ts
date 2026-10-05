import { create } from 'zustand';

export type EmptyStateKey = 'discover' | 'likes' | 'matches';

interface DevState {
  /** Force a screen to render its empty state, regardless of data. */
  forceEmpty: Record<EmptyStateKey, boolean>;
  toggleEmpty: (key: EmptyStateKey) => void;
}

export const useDevStore = create<DevState>((set) => ({
  forceEmpty: { discover: false, likes: false, matches: false },
  toggleEmpty: (key) =>
    set((s) => ({ forceEmpty: { ...s.forceEmpty, [key]: !s.forceEmpty[key] } })),
}));
