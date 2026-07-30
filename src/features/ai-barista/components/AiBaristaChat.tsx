"use client";

import { Loader2, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { useAiBaristaChat } from "../hooks/useAiBaristaChat";
import { AiBaristaSteam } from "./AiBaristaSteam";
import { MessageBubble } from "./MessageBubble";

const WELCOME_MESSAGE =
  "Hi, I'm your barista. Tell me a bit about what you're after — how's your mood today, and are you looking for something to power through work, or more of a relaxing sip?";

/**
 * Sprint 3.9, Task 4 — the chat window's content, mounted inside
 * `AiBaristaLauncher`'s `Sheet` (focus trap/Escape/backdrop dismissal
 * reused from Base UI, not hand-rolled here — "No duplicated overlay
 * logic" per the brief). Enter sends, Shift+Enter inserts a newline —
 * matching every other multiline-input-with-a-primary-action convention.
 */
export function AiBaristaChat() {
  const { messages, isStreaming, send, retry, cancel } = useAiBaristaChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessage = messages[messages.length - 1];
  const lastFailed = lastMessage?.status === "error";

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  // The "Stop generating" button unmounts the instant streaming ends
  // (swapped for "Send"), taking focus with it if it was focused — without
  // this, focus silently falls back to `<body>`, breaking the Sheet's
  // focus containment and, with it, Escape-to-close. Textarea re-enables
  // (see `disabled={isStreaming}` below) at the exact same moment, so it's
  // always a valid focus target here.
  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  function handleSend() {
    if (!draft.trim() || isStreaming) return;
    send(draft);
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <SheetHeader className="relative overflow-hidden">
        <AiBaristaSteam className="top-0 h-16" />
        <SheetTitle>AI Barista</SheetTitle>
        <SheetDescription>Tell me what you&apos;re in the mood for.</SheetDescription>
      </SheetHeader>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm">{WELCOME_MESSAGE}</div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <div className="flex flex-col gap-2 border-t p-4">
        {lastFailed && !isStreaming && (
          <Button type="button" variant="outline" size="sm" onClick={retry} className="self-start">
            Retry last message
          </Button>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a drink, or tell me what you're craving…"
            rows={2}
            className="resize-none"
            aria-label="Message the AI barista"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button type="button" variant="outline" size="icon" aria-label="Stop generating" onClick={cancel}>
              <Square className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" size="icon" aria-label="Send message" onClick={handleSend} disabled={!draft.trim()}>
              <Send className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        {isStreaming && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Thinking…
          </p>
        )}
      </div>
    </div>
  );
}
