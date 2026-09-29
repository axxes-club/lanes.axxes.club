import type { ReactNode } from "react"

/**
 * Documentation content.
 *
 * Written as JSX rather than Markdown on purpose. There is no markdown
 * dependency in this project, and a docs site is the one place where adding
 * a parser, a loader, a syntax highlighter and a sanitiser to render half a
 * page of prose is a bad trade. JSX gives exact control over what a code
 * block looks like, which is most of what a developer reads here anyway.
 *
 * Every example in these pages has been run against a real instance. A
 * quickstart that does not work is worse than no quickstart.
 */

export type DocBlock =
  | { kind: "p"; text: ReactNode }
  | { kind: "h2"; id: string; text: string }
  | { kind: "h3"; id: string; text: string }
  | { kind: "code"; lang: string; code: string; caption?: string }
  | { kind: "list"; items: ReactNode[] }
  | { kind: "ordered"; items: ReactNode[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; tone: "info" | "warn" | "good"; title: string; text: ReactNode }
  | { kind: "endpoint"; method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; blurb: string }
  | { kind: "matrix"; roles: string[] }

export type DocBody = DocBlock[]

export const p = (text: ReactNode): DocBlock => ({ kind: "p", text })
export const h2 = (id: string, text: string): DocBlock => ({ kind: "h2", id, text })
export const h3 = (id: string, text: string): DocBlock => ({ kind: "h3", id, text })
export const code = (lang: string, code: string, caption?: string): DocBlock => ({ kind: "code", lang, code, caption })
export const list = (items: ReactNode[]): DocBlock => ({ kind: "list", items })
export const ordered = (items: ReactNode[]): DocBlock => ({ kind: "ordered", items })
export const table = (head: string[], rows: string[][]): DocBlock => ({ kind: "table", head, rows })
export const note = (tone: "info" | "warn" | "good", title: string, text: ReactNode): DocBlock => ({ kind: "note", tone, title, text })
export const ep = (method: "GET" | "POST" | "PATCH" | "DELETE", path: string, blurb: string): DocBlock => ({ kind: "endpoint", method, path, blurb })
