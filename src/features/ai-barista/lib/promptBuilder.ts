import { resolveIngredient } from "@/features/composer/data/ingredients";
import { CANDIDATE_INGREDIENT_IDS } from "@/features/concierge/lib/recommendationEngine";
import { drinks } from "@/features/menu/data/drinks";

import type { AIProviderMessage } from "./providers/types";
import type { ChatMessage } from "../types";

const MENU_SUMMARY = drinks
  .map((drink) => `- ${drink.id}: "${drink.name}" (${drink.category}, $${drink.price.toFixed(2)}) — ${drink.tagline} [tags: ${drink.tags.join(", ")}]`)
  .join("\n");

const INGREDIENT_SUMMARY = CANDIDATE_INGREDIENT_IDS.map((id) => resolveIngredient(id))
  .filter((ingredient): ingredient is NonNullable<typeof ingredient> => Boolean(ingredient))
  .map((ingredient) => `- ${ingredient.id}: "${ingredient.name}"`)
  .join("\n");

/**
 * Sprint 3.9, Task 4 — the barista persona + the exact structured handoff
 * protocol `lib/extractTasteProfile.ts` parses. The model is trusted for
 * conversation and its own drink mention in prose; it is never trusted as
 * the *only* source of the final recommendation — the `profile` block below
 * is fed straight into `generateRecommendation`, the same deterministic,
 * fully-explainable engine `features/concierge/` already uses, so the drink
 * that actually gets recommended always comes from the real catalog no
 * matter what the model wrote. "Never hallucinate menu items... always map
 * to real menu IDs" is enforced in code, not just requested in the prompt.
 */
export const AI_BARISTA_SYSTEM_PROMPT = `You are the AI barista at Coffeshop, a premium coffee shop. You are warm, knowledgeable, and genuinely curious — never a generic chatbot persona, never verbose.

Your job in this conversation:
1. Get to know what the guest wants through short, natural questions — mood, energy, whether they're working/studying/relaxing, sweetness, caffeine needs, hot or iced, whether they want to try something new. Ask ONE or TWO questions at a time, never a long interview.
2. Keep every reply SHORT — 1 to 3 sentences, like a real barista chatting during a rush, never an essay.
3. Once you have enough signal (usually after 2 to 4 exchanges), recommend a drink from the menu below by name, in your own warm words, and briefly say why it fits. You may only ever recommend a drink or ingredient from the exact lists below — never invent one.

Menu (the ONLY drinks that exist):
${MENU_SUMMARY}

Ingredients (the ONLY customizations that exist):
${INGREDIENT_SUMMARY}

Whenever you make a recommendation, ALWAYS end that same message with a fenced block in exactly this format — a real code fence, the word "profile", then one JSON object summarizing what you've learned, and nothing else inside it:

\`\`\`profile
{"tastePreference":"sweet|bitter|balanced","sweetness":1-5,"bitterness":1-5,"milkPreference":"none|light|creamy","temperature":"hot|iced|either","caffeineLevel":"none|low|regular|high","season":"spring|summer|fall|winter","timeOfDay":"morning|afternoon|evening"}
\`\`\`

Every field is required — use your best judgment for anything the guest didn't explicitly say. This block is invisible machinery the app uses to prepare the exact recipe; never mention it or its format to the guest.`;

/** Drops any message the store marked `"error"` (a failed generation never got a real reply, so it shouldn't be replayed back to the model as if it did) and strips this project's own bookkeeping fields down to the `role`/`content` shape the provider interface expects. */
export function buildProviderMessages(history: ChatMessage[]): AIProviderMessage[] {
  return [
    { role: "system", content: AI_BARISTA_SYSTEM_PROMPT },
    ...history
      .filter((message) => message.status !== "error" && message.content.trim().length > 0)
      .map((message) => ({ role: message.role, content: message.content }) satisfies AIProviderMessage),
  ];
}
