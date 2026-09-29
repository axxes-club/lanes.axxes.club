import Link from "next/link"
import { DOC_PAGES } from "@/lib/docs/registry"
import { findDoc, neighbours } from "@/lib/docs/nav"
import { DocBodyView, headings } from "@/lib/docs/render"
import { IconArrowRight } from "@/components/icons"

export const metadata = { title: "Docs", description: findDoc("")?.summary }

/**
 * The introduction lives at `/docs` rather than `/docs/introduction`.
 *
 * An empty slug cannot match `[slug]`, and a docs site whose front page is a
 * redirect to a second URL is a worse first impression than one that just is
 * the thing. The rest of the pages are ordinary routes.
 */
export default function DocsIndex() {
  const body = DOC_PAGES[""]
  const page = findDoc("")!
  const outline = headings(body)
  const { next } = neighbours("")

  return (
    <div className="flex min-w-0 gap-10">
      <article className="min-w-0 max-w-3xl flex-1">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-lg text-muted text-pretty">{page.summary}</p>
        <div className="mt-8">
          <DocBodyView body={body} />
        </div>
        {next && (
          <Link href={`/docs/${next.slug}`} className="btn-primary btn-lg mt-10">
            {next.title} <IconArrowRight size={16} />
          </Link>
        )}
      </article>

      {outline.length > 2 && (
        <aside className="hidden w-56 shrink-0 xl:block">
          <nav className="sticky top-22" aria-label="On this page">
            <p className="eyebrow mb-2">On this page</p>
            <ul className="space-y-1 border-l border-line text-sm">
              {outline.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className={`block border-l border-transparent py-1 pl-3 text-muted transition hover:border-accent hover:text-text ${h.level === 3 ? "pl-6 text-xs" : ""}`}>
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  )
}
