import { create } from "zustand";

/** The live search query text — decoupled from `MenuExperience` so `useSearchQuery.ts` can read it without prop drilling, and any future search surface (e.g. a nav quick-search) can share the same in-flight query. */
interface SearchStoreState {
  query: string;
  setQuery: (query: string) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchStoreState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  clear: () => set({ query: "" }),
}));
