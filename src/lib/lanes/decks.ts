/**
 * Estimation decks.
 *
 * Kept out of `poker.ts` because `poker.ts` is server-only and the voting UI
 * is a client component. The deck is data that both sides need, so it lives
 * where neither of them has to reach across a boundary for it.
 *
 * The half-step is deliberately absent from the plain Fibonacci deck. Teams
 * that want it use `modified_fibonacci`; the argument it causes is the reason
 * it is not the default.
 */
export type DeckName = "fibonacci" | "modified_fibonacci" | "powers_of_two" | "t_shirt"

export const DECKS: Record<DeckName, string[]> = {
  fibonacci: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?"],
  modified_fibonacci: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"],
  powers_of_two: ["0", "1", "2", "4", "8", "16", "32", "64", "?", "", "", ""],
  t_shirt: ["XS", "S", "M", "L", "XL", "XXL", "?", "", "", "", ""],
}

export const DECK_LABELS: Record<DeckName, string> = {
  fibonacci: "Fibonacci",
  modified_fibonacci: "Modified Fibonacci",
  powers_of_two: "Powers of two",
  t_shirt: "T-shirt sizes",
}

export function isDeck(name: string): name is DeckName {
  return Object.prototype.hasOwnProperty.call(DECKS, name)
}

/** The cards actually in play — decks are padded so the grid stays even. */
export function deckFor(name: string): string[] {
  return (isDeck(name) ? DECKS[name] : DECKS.fibonacci).filter(Boolean)
}
