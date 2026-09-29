"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cx } from "@/components/ui"
import { IconClose, IconExternal, IconLink, IconPlus, IconSearch } from "@/components/icons"
import { linkRecordAction, searchLinkableRecords, unlinkRecordAction } from "@/lib/lanes/link-actions"
import { RECORD_SOURCES } from "@/lib/axxes/record-kinds"
import type { LinkedRecord } from "@/lib/axxes/records"
import type { CardLinkView } from "@/lib/lanes/link-data"

/**
 * Links to records in the rest of the AXXES suite.
 *
 * The picker is deliberately one field rather than one form per record type.
 * A card that might be about a customer, an order, a venue or a product is a
 * card a person will not want to open four different dialogs to fill in, and
 * the part that actually matters — picking a thing that already exists — is
 * identical in all four cases.
 *
 * The kind selector is a plain row of pills rather than a dropdown, because
 * there are six of them and a dropdown hides the sixth behind a click.
 */
export function LinkedRecords({
  cardId,
  links,
  canEdit,
}: {
  cardId: string
  links: CardLinkView[]
  canEdit: boolean
}) {
  const [adding, setAdding] = useState(false)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wider text-muted uppercase">Linked records</h3>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-accent hover:underline">
            <IconPlus size={12} /> Link
          </button>
        )}
      </div>

      {adding && <Picker cardId={cardId} onDone={() => setAdding(false)} />}

      {links.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-4 text-xs text-muted text-pretty">
          Nothing linked. A linked customer, order, event or product is the live row from the AXXES app that owns it — not a
          copy, and not a sync.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} cardId={cardId} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </section>
  )
}

function LinkRow({ link, cardId, canEdit }: { link: CardLinkView; cardId: string; canEdit: boolean }) {
  const router = useRouter()
  const [, start] = useTransition()

  return (
    <li
      className={cx(
        "group flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2",
        link.missing && "opacity-60",
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent-soft text-accent" aria-hidden>
        <IconLink size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">
          {link.label}
          {link.missing && <span className="ml-2 text-[11px] text-warning">no longer exists</span>}
        </span>
        <span className="block truncate text-[11px] text-muted">
          {link.product} &middot; {link.kind.replace("_", " ")}
          {link.detail ? ` · ${link.detail}` : ""}
        </span>
      </span>
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost btn-icon-sm"
        title={`Open in ${link.product}`}
        aria-label={`Open in ${link.product}`}
      >
        <IconExternal size={13} />
      </a>
      {canEdit && (
        <button
          type="button"
          onClick={() => start(async () => {
            await unlinkRecordAction(cardId, link.id)
            router.refresh()
          })}
          className="btn-ghost btn-icon-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          title="Unlink"
          aria-label={`Unlink ${link.label}`}
        >
          <IconClose size={13} />
        </button>
      )}
    </li>
  )
}

function Picker({ cardId, onDone }: { cardId: string; onDone: () => void }) {
  const router = useRouter()
  const [kind, setKind] = useState(RECORD_SOURCES[0].kind)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<LinkedRecord[]>([])
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Debounced, and stale responses are discarded: typing "a" then "ab" must
  // not let the "a" results land second and overwrite the "ab" ones.
  useEffect(() => {
    let live = true
    const t = setTimeout(async () => {
      const r = await searchLinkableRecords(kind, q).catch(() => ({ records: [] }))
      if (live && r.records) setResults(r.records)
    }, 120)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [kind, q])

  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <div className="mb-2.5 flex flex-wrap gap-1">
        {RECORD_SOURCES.map((r) => (
          <button
            key={r.kind}
            type="button"
            onClick={() => setKind(r.kind)}
            className={cx(
              "rounded-md px-2 py-1 text-[11px] font-medium capitalize transition",
              kind === r.kind ? "bg-accent-soft text-accent" : "text-muted hover:bg-panel-3 hover:text-text",
            )}
          >
            {r.kind.replace("_", " ")}
            <span className="ml-1 opacity-60">{r.product}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <IconSearch size={14} className="shrink-0 text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="input input-sm"
          aria-label="Search records"
        />
        <button type="button" onClick={onDone} className="btn-ghost btn-icon-sm" aria-label="Cancel">
          <IconClose size={13} />
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {results.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted">
            {q ? "Nothing matched." : "Nothing here yet — records from the other AXXES apps appear as soon as they exist."}
          </li>
        ) : (
          results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    const res = await linkRecordAction(cardId, r.kind, r.id, r.label, r.detail, r.product).catch((e) => ({
                      error: e instanceof Error ? e.message : "Could not link that",
                    }))
                    if (res.error) return setError(res.error)
                    setQ("")
                    router.refresh()
                  })
                }
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-panel-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.label}</span>
                  {r.detail && <span className="block truncate text-[11px] text-muted">{r.detail}</span>}
                </span>
                <span className="shrink-0 text-[10px] text-faint">{r.product}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
