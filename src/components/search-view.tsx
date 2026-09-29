"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Kbd } from "@/components/ui"
import { Avatar } from "@/components/avatar"
import { IconArrowRight, IconBoard, IconCard, IconClose, IconSearch, IconUser } from "@/components/icons"
import { searchAction } from "@/lib/lanes/commands"
import type { SearchHit } from "@/lib/lanes/search"

/**
 * The search page.
 *
 * The same function the command palette calls, deliberately. Two surfaces
 * that each had their own query would rank the same board differently, and
 * the first person to notice would stop trusting both.
 *
 * It reads ?q= from the URL so a result set is linkable, and writes back to
 * it so the browser's back button moves through searches rather than leaving
 * the page entirely.
 */
export function SearchView({ initial = "" }: { initial?: string }) {
  const router = useRouter()
  const [, start] = useTransition()
  const [query, setQuery] = useState(initial)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      const results = await searchAction(q).catch(() => [])
      // A response that arrives after a newer query was sent is stale.
      if (id !== requestId.current) return
      setHits(results)
      setLoading(false)
    }, 120)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const handle = setTimeout(() => {
      const url = query.trim() ? `/dashboard/search?q=${encodeURIComponent(query.trim())}` : "/dashboard/search"
      start(() => router.replace(url, { scroll: false }))
    }, 350)
    return () => clearTimeout(handle)
  }, [query, router])

  const grouped = group(hits)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-4 z-10 -mx-2 bg-bg/85 px-2 py-2 backdrop-blur">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 shadow-sm focus-within:border-accent">
          <IconSearch size={18} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards, cards and people. Try WEB-42."
            aria-label="Search"
            className="w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-faint"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="btn-ghost btn-icon-sm" aria-label="Clear">
              <IconClose size={14} />
            </button>
          )}
          <Kbd className="hidden sm:inline-flex">esc</Kbd>
        </div>
      </div>

      <div className="mt-4" aria-live="polite" aria-busy={loading}>
        {!query.trim() ? (
          <div className="card p-8 text-center">
            <p className="text-sm font-medium">Search your whole workspace</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted text-pretty">
              Boards by name, cards by title or description, people by name or email. A card key like{" "}
              <code className="rounded border border-line bg-panel-2 px-1 py-0.5 font-mono text-xs">WEB-42</code> jumps
              straight to that card.
            </p>
          </div>
        ) : hits.length === 0 && !loading ? (
          <div className="card p-10 text-center">
            <p className="text-sm font-medium">Nothing matched &ldquo;{query}&rdquo;</p>
            <p className="mt-1.5 text-sm text-muted">Try fewer words, or press &#8984;K from any screen.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([kind, list]) => (
              <section key={kind}>
                <h2 className="eyebrow mb-2">
                  {kind === "board" ? "Boards" : kind === "card" ? "Cards" : "People"} &middot; {list.length}
                </h2>
                <div className="card divide-y divide-line-soft overflow-hidden">
                  {list.map((h) => {
                    const Icon = h.kind === "board" ? IconBoard : h.kind === "card" ? IconCard : IconUser
                    const image = (h.meta?.image as string) ?? undefined
                    return (
                      <Link
                        key={`${h.kind}-${h.id}`}
                        href={h.href}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-panel-2"
                      >
                        {image ? (
                          <Avatar name={h.title} src={image} size={28} />
                        ) : h.meta?.color ? (
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: String(h.meta.color) }}
                            aria-hidden
                          />
                        ) : (
                          <Icon size={16} className="shrink-0 text-faint" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{h.title}</span>
                          {h.subtitle && <span className="block truncate text-xs text-muted">{h.subtitle}</span>}
                        </span>
                        <IconArrowRight size={14} className="shrink-0 text-faint" />
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function group(hits: SearchHit[]): [SearchHit["kind"], SearchHit[]][] {
  const order: SearchHit["kind"][] = ["board", "card", "person"]
  return order
    .map((k) => [k, hits.filter((h) => h.kind === k)] as [SearchHit["kind"], SearchHit[]])
    .filter(([, list]) => list.length > 0)
}
