import { Fragment, type ReactNode } from "react"
import { IconCheck, IconCheckCircle, IconInfo, IconWarning } from "@/components/icons"
import type { DocBody, DocBlock } from "./content"
import { BOARD_ROLES, BOARD_ROLE_LABEL } from "@/lib/lanes/permissions"
import { can } from "@/lib/lanes/permissions"
import { CopyButton } from "@/components/copy-button"

/**
 * Renders a documentation body.
 *
 * Server-rendered: the content is static, and a docs site that ships its own
 * runtime to display text has given away more than it needed to. The only
 * client component is the copy button.
 */
export function DocBodyView({ body }: { body: DocBody }) {
  return <div className="prose-doc">{body.map((block, i) => <Block key={i} block={block} />)}</div>
}

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>
    case "h2":
      return (
        <h2 id={block.id}>
          <a href={`#${block.id}`} className="text-text no-underline hover:text-accent">
            {block.text}
          </a>
        </h2>
      )
    case "h3":
      return <h3 id={block.id}>{block.text}</h3>
    case "list":
      return <ul>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    case "ordered":
      return <ol>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ol>
    case "code":
      return <CodeBlock lang={block.lang} code={block.code} caption={block.caption} />
    case "table":
      return (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    case "note":
      return <Note tone={block.tone} title={block.title}>{block.text}</Note>
    case "endpoint":
      return (
        <div className="my-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3">
          <span
            className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
              block.method === "GET"
                ? "bg-info-soft text-info"
                : block.method === "POST"
                  ? "bg-success-soft text-success"
                  : block.method === "PATCH"
                    ? "bg-warning-soft text-warning"
                    : "bg-danger-soft text-danger"
            }`}
          >
            {block.method}
          </span>
          <code className="font-mono text-[13px] text-text">{block.path}</code>
          <span className="text-sm text-muted">{block.blurb}</span>
        </div>
      )
    case "matrix":
      return <RoleMatrix roles={block.roles} />
  }
}

function CodeBlock({ lang, code, caption }: { lang: string; code: string; caption?: string }) {
  return (
    <figure className="my-5">
      <div className="code-block" data-lang={lang}>
        <pre className="m-0 whitespace-pre"><code>{code}</code></pre>
      </div>
      {caption && (
        <figcaption className="mt-1.5 flex items-center justify-between text-xs text-muted">
          <span>{caption}</span>
          <CopyButton value={code} />
        </figcaption>
      )}
      {caption === undefined && (
        <figcaption className="mt-1.5 flex justify-end">
          <CopyButton value={code} />
        </figcaption>
      )}
    </figure>
  )
}

const TONES = {
  info: { cls: "border-info/30 bg-info-soft", Icon: IconInfo, label: "text-info" },
  warn: { cls: "border-warning/30 bg-warning-soft", Icon: IconWarning, label: "text-warning" },
  good: { cls: "border-success/30 bg-success-soft", Icon: IconCheckCircle, label: "text-success" },
} as const

function Note({ tone, title, children }: { tone: keyof typeof TONES; title: string; children: ReactNode }) {
  const { cls, Icon, label } = TONES[tone]
  return (
    <aside className={`my-5 rounded-lg border px-4 py-3 ${cls}`}>
      <p className={`flex items-center gap-2 text-sm font-semibold ${label}`}>
        <Icon size={15} />
        {title}
      </p>
      <div className="mt-1.5 text-sm leading-relaxed text-text-2">{children}</div>
    </aside>
  )
}

/**
 * The permission matrix, generated from the same table the server uses.
 *
 * Rendered rather than written out so the page cannot drift out of date with
 * `permissions.ts` — which is the failure mode of every permissions table in
 * every README ever written.
 */
function RoleMatrix({ roles }: { roles: string[] }) {
  const groups: { group: string; permissions: string[] }[] = [
    { group: "Board", permissions: ["board.update", "board.settings", "board.members", "board.delete"] },
    { group: "Cards", permissions: ["card.create", "card.update", "card.move", "card.assign", "card.priority", "card.comment", "card.verify", "card.delete"] },
    { group: "Backlog", permissions: ["backlog.write", "backlog.groom"] },
    { group: "Sprints", permissions: ["sprint.manage", "sprint.commit", "sprint.complete"] },
    { group: "Planning", permissions: ["poker.read", "poker.facilitate"] },
  ]

  return (
    <div className="card my-6 overflow-x-auto">
      <table className="min-w-[52rem]">
        <thead>
          <tr>
            <th className="w-40">Role</th>
            {roles.map((r) => (
              <th key={r} className="text-center text-[11px]">{BOARD_ROLE_LABEL[r as keyof typeof BOARD_ROLE_LABEL]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.group}>
              <tr className="bg-panel-2">
                <td colSpan={roles.length + 1} className="text-[11px] uppercase tracking-wider">{g.group}</td>
              </tr>
              {g.permissions.map((p) => (
                <tr key={p}>
                  <td className="font-mono text-xs">{p.replace(".", " ")}</td>
                  {roles.map((r) => (
                    <td key={r} className="text-center">
                      {can(r as never, p as never) ? (
                        <IconCheck size={14} className="mx-auto text-success" />
                      ) : (
                        <span className="text-faint">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
