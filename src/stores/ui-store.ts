import { create } from "zustand";

interface UIState {
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  devPanelOpen: boolean;
  toggleDevPanel: () => void;
}

/** Ephemeral, client-only UI state — never anything server/remote. See ADR-0005. */
export const useUIStore = create<UIState>((set) => ({
  navOpen: false,
  setNavOpen: (open) => set({ navOpen: open }),
  devPanelOpen: false,
  toggleDevPanel: () => set((state) => ({ devPanelOpen: !state.devPanelOpen })),
}));
