import { Fragment } from "react";
import type { ReactNode } from "react";

/** Bold/italic/inline-code within a single line. Code first in the alternation so `**`/`*` inside a code span is never mistaken for emphasis. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="bg-background/60 rounded px-1 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Sprint 3.9, Task 4 — a small, dependency-free markdown renderer: bold,
 * italic, inline code, unordered lists, and fenced code blocks. No external
 * markdown library — the barista's replies are short conversational
 * sentences, not full documents, so this covers the real surface without a
 * new dependency. Fenced code blocks render into a real `<pre><code
 * data-language>` structure (not a flattened string) so a syntax
 * highlighter can be dropped in later purely by enhancing the code-block
 * branch below — "future-proof" per the brief, without wiring an unused
 * highlighting library now for zero current consumers.
 */
export function renderMarkdown(content: string): ReactNode {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    const items = listBuffer;
    listBuffer = [];
    blocks.push(
      <ul key={`list-${blocks.length}`} className="ml-4 list-disc space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
  }

  while (index < lines.length) {
    const line = lines[index]!;
    const codeMatch = line.match(/^```(\w*)\s*$/);
    if (codeMatch) {
      flushList();
      const language = codeMatch[1] || undefined;
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !lines[index]!.startsWith("```")) {
        codeLines.push(lines[index]!);
        index++;
      }
      index++; // skip the closing fence
      blocks.push(
        <pre key={`code-${blocks.length}`} className="bg-background/60 overflow-x-auto rounded-md p-2 text-xs">
          <code data-language={language}>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      listBuffer.push(listMatch[1]!);
      index++;
      continue;
    }

    flushList();
    if (line.trim().length > 0) {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line, `p-${blocks.length}`)}</p>);
    }
    index++;
  }
  flushList();

  return <Fragment>{blocks}</Fragment>;
}
