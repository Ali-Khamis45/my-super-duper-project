"use client";

import { useMemo } from "react";

import { generateRecommendation } from "@/features/concierge/lib/recommendationEngine";
import { drinks } from "@/features/menu/data/drinks";
import { useCustomizerStore } from "@/stores/customizer-store";

import { detectMentionedDrinkCategory } from "../lib/detectMentionedDrink";
import { extractTasteProfile } from "../lib/extractTasteProfile";
import { renderMarkdown } from "../lib/renderMarkdown";
import type { ChatMessage } from "../types";
import { RecommendationCard } from "./RecommendationCard";
import { TypingIndicator } from "./TypingIndicator";

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * Sprint 3.9, Task 4 — extraction only runs on a `"complete"` assistant
 * message (never mid-stream: parsing a half-arrived fenced block would
 * intermittently "succeed" on a truncated JSON string) and is memoized on
 * `message.content` itself, so it re-runs exactly once per finished
 * message, not on every store update elsewhere in the app.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const currentCategory = useCustomizerStore((state) => state.baseDrinkCategory);

  const { displayContent, recommendation } = useMemo(() => {
    if (isUser || message.status !== "complete") {
      return { displayContent: message.content, recommendation: null };
    }
    const { displayContent, profile } = extractTasteProfile(message.content);
    if (!profile) return { displayContent, recommendation: null };
    const mentionedCategory = detectMentionedDrinkCategory(displayContent);
    return { displayContent, recommendation: generateRecommendation(profile, drinks, { currentCategory: mentionedCategory ?? currentCategory }) };
  }, [isUser, message.content, message.status, currentCategory]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {message.status === "streaming" && displayContent.length === 0 ? (
          <TypingIndicator />
        ) : (
          <div className="space-y-2">{renderMarkdown(displayContent)}</div>
        )}
        {message.status === "error" && <p className="text-destructive mt-1 text-xs">Something went wrong — want to try again?</p>}
        {recommendation && <RecommendationCard recommendation={recommendation} />}
      </div>
    </div>
  );
}
