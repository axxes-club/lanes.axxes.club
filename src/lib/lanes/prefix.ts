/**
 * Card key conventions.
 *
 * A card key is how a card is referred to in a standup, a commit message or
 * a bug report, so it has to be short, stable and recognisable. Three things
 * are configurable per board because teams argue about all three:
 *
 *   prefix   LN-123      the board's initials
 *   padding  LN-0123     zero-padded to a fixed width
 *   scope    LN-123      or SCRUM-2-LN-123 when a card belongs to a sprint
 *
 * The prefix never changes once a board has cards: renumbering a shipped
 * board breaks every reference to it, so the prefix is set at creation and
 * only the padding and scope are editable afterwards.
 */

export type PrefixSettings = {
  keyPrefix?: string
  keyPadding?: number
  keyWithSprint?: boolean
}

/** Words that are only digits make terrible prefixes (2026, V2, 3d). */
function initialsOf(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w && !/^\d+$/.test(w))

  if (words.length > 1) return words.map((w) => w[0]).join("")
  return (words[0] ?? "LN").slice(0, 3)
}

export function boardPrefix(settings: unknown, name: string): string {
  const s = (settings ?? {}) as PrefixSettings
  const fromSettings = (s.keyPrefix ?? "").trim()
  if (fromSettings) return normalisePrefix(fromSettings)
  return normalisePrefix(initialsOf(name))
}

/** Uppercase, letters and digits only, 2-6 characters. */
export function normalisePrefix(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return "LN"
  // A prefix of digits is indistinguishable from the sequence next to it.
  if (!/[A-Z]/.test(cleaned)) return `LN${cleaned}`.slice(0, 6)
  return cleaned.slice(0, 6)
}

export function paddingOf(settings: unknown): number {
  const n = Number((settings as PrefixSettings | null)?.keyPadding ?? 2)
  if (!Number.isInteger(n) || n < 1 || n > 6) return 2
  return n
}

/**
 * Build a key. `seq` is the card's stable per-board number — never the list
 * position, which changes every time somebody drags a card.
 */
export function cardKey(
  settings: unknown,
  boardName: string,
  seq: number,
  sprintName?: string | null,
): string {
  const prefix = boardPrefix(settings, boardName)
  const width = paddingOf(settings)
  const n = String(Math.max(0, Math.floor(seq))).padStart(width, "0")
  const withSprint = (settings as PrefixSettings | null)?.keyWithSprint === true && sprintName
  if (!withSprint) return `${prefix}-${n}`

  // The sprint contributes a short form, never the whole name: "Sprint 4" -> S4,
  // "Alpha" -> A. Without the cap, a sprint called "Quarterly hardening" would
  // produce CF-QH07 only by luck, and one called "Alpha" produced CF-ALPHA07.
  const short = sprintShort(sprintName)
  return `${prefix}-${short}${n}`
}

/** A sprint's short form, at most 3 characters so a key stays readable. */
export function sprintShort(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 3)
  return ((words[0] ?? "S")[0] ?? "S").toUpperCase()
}

/** A stable machine key for a custom field, derived from its display name. */
export function fieldKey(name: string): string {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
  return /^[a-z]/.test(key) ? key : `f_${key}`
}
