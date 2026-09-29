/**
 * Keyboard shortcuts.
 *
 * Declared once, in one place, for three reasons:
 *
 *   - the board implements them,
 *   - the shortcuts sheet (press `?`) renders them, and
 *   - the documentation lists them.
 *
 * A shortcut sheet that is maintained by hand is a shortcut sheet that is
 * wrong within a release, and the fastest way to lose somebody's trust in
 * "it just works" is a help overlay that lies.
 *
 * Two rules decide whether a key reaches the board at all:
 *
 *   1. If focus is in a field, the keystroke is text. Nobody wants `j` to
 *      close a dialog because they were typing a description.
 *   2. If a modifier is held, it is somebody else's shortcut — cmd-K, cmd-Z,
 *      the browser's own. The board only claims bare keys.
 */

export type Shortcut = {
  keys: string[]
  description: string
  /** Grouped in the sheet, so it reads as a list of ideas not a wall of keys. */
  group: "Navigate" | "Create" | "Edit" | "Board" | "Global"
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["J"], description: "Next card", group: "Navigate" },
  { keys: ["K"], description: "Previous card", group: "Navigate" },
  { keys: ["↵"], description: "Open the selected card", group: "Navigate" },
  { keys: ["Esc"], description: "Close, or clear the filters", group: "Navigate" },
  { keys: ["/"], description: "Search everything", group: "Navigate" },
  { keys: ["⌘", "K"], description: "Command palette", group: "Global" },
  { keys: ["N"], description: "New card in the first lane", group: "Create" },
  { keys: ["C"], description: "Compose a card in the lane you last touched", group: "Create" },
  { keys: ["L"], description: "Add a lane", group: "Create" },
  { keys: ["E"], description: "Rename the board", group: "Edit" },
  { keys: ["X"], description: "Clear every filter", group: "Edit" },
  { keys: ["V"], description: "Switch between board and list", group: "Board" },
  { keys: ["S"], description: "Star this board", group: "Board" },
  { keys: ["?"], description: "This list", group: "Board" },
]

export const SHORTCUT_GROUPS = ["Navigate", "Create", "Edit", "Board", "Global"] as const

/** The displayed key for a shortcut on this platform. */
export function keyLabel(key: string): string {
  if (key === "⌘") return "⌘"
  return key
}
