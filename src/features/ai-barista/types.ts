export type ChatRole = "user" | "assistant";

export type ChatMessageStatus = "complete" | "streaming" | "error";

/**
 * One turn in the AI Barista conversation. `content` grows incrementally
 * for a `"streaming"` assistant message (see `stores/ai-barista-store.ts`'s
 * `appendToAssistantMessage`) — the same message object the whole time, not
 * replaced each chunk, so React's reconciliation stays stable while text
 * streams in.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status: ChatMessageStatus;
}
