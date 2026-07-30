/** `"cold-brew"` → `"Cold Brew"` — a display-only formatting of the raw category code, not a second source of category names (the real name lives on `CategoryDto`, fetched separately where it matters). */
export function formatCategoryCode(code: string): string {
  return code
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
