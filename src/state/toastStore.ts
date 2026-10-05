import { create } from 'zustand';

interface ToastState {
  message: string | null;
  /** Bumped on every show so repeated identical messages still re-animate. */
  nonce: number;
  show: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  nonce: 0,
  show: (message) => set((s) => ({ message, nonce: s.nonce + 1 })),
  hide: () => set({ message: null }),
}));
