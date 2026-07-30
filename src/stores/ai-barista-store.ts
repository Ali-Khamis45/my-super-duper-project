import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ChatMessage } from "@/features/ai-barista/types";

function newId(): string {
  return crypto.randomUUID();
}

interface AiBaristaStoreState {
  isOpen: boolean;
  conversationId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addUserMessage: (content: string) => void;
  beginAssistantMessage: () => void;
  appendToAssistantMessage: (delta: string) => void;
  completeAssistantMessage: () => void;
  failAssistantMessage: () => void;
  removeLastMessage: () => void;
  resetConversation: () => void;
}

/**
 * Sprint 3.9, Task 4's dedicated conversation state — same convention
 * `customizer-store.ts`/`concierge-store.ts` already established: a small,
 * flat, feature-dedicated Zustand store in `src/stores/`, `sessionStorage`-
 * persisted ("session persistence" per the brief, matching every sibling
 * AI/customization store's own session-only policy). `isOpen` is
 * deliberately NOT persisted — reopening a fresh tab shouldn't auto-pop the
 * chat window open, only its history should survive.
 */
export const useAiBaristaStore = create<AiBaristaStoreState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      conversationId: newId(),
      messages: [],
      isStreaming: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),

      addUserMessage: (content) => {
        const message: ChatMessage = { id: newId(), role: "user", content, createdAt: Date.now(), status: "complete" };
        set({ messages: [...get().messages, message] });
      },

      beginAssistantMessage: () => {
        const message: ChatMessage = { id: newId(), role: "assistant", content: "", createdAt: Date.now(), status: "streaming" };
        set({ messages: [...get().messages, message], isStreaming: true });
      },

      appendToAssistantMessage: (delta) => {
        const messages = get().messages;
        const last = messages[messages.length - 1];
        if (!last || last.role !== "assistant") return;
        set({ messages: [...messages.slice(0, -1), { ...last, content: last.content + delta }] });
      },

      completeAssistantMessage: () => {
        const messages = get().messages;
        const last = messages[messages.length - 1];
        if (!last || last.role !== "assistant") {
          set({ isStreaming: false });
          return;
        }
        set({ messages: [...messages.slice(0, -1), { ...last, status: "complete" }], isStreaming: false });
      },

      failAssistantMessage: () => {
        const messages = get().messages;
        const last = messages[messages.length - 1];
        if (!last || last.role !== "assistant") {
          set({ isStreaming: false });
          return;
        }
        set({ messages: [...messages.slice(0, -1), { ...last, status: "error" }], isStreaming: false });
      },

      removeLastMessage: () => set({ messages: get().messages.slice(0, -1) }),

      resetConversation: () => set({ conversationId: newId(), messages: [], isStreaming: false }),
    }),
    {
      name: "coffeshop-ai-barista",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ conversationId: state.conversationId, messages: state.messages }),
    },
  ),
);
