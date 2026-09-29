import { notFound } from "next/navigation"
import Link from "next/link"
import { DOC_PAGES } from "@/lib/docs/registry"
import { findDoc, neighbours } from "@/lib/docs/nav"
import { DocBodyView, headings } from "@/lib/docs/render"
import { IconArrowLeft, IconArrowRight } from "@/components/icons"

export function generateStaticParams() {
  // The empty slug is the /docs index, which is its own route.
  return Object.keys(DOC_PAGES).filter((slug) => slug !== "").map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = findDoc(slug)
  return { title: page?.title ?? "Docs", description: page?.summary }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = DOC_PAGES[slug]
  const page = findDoc(slug)
  if (!body || !page) notFound()

  const outline = headings(body)
  const { prev, next } = neighbours(slug)

  return (
    <div className="flex min-w-0 gap-10">
      <article className="min-w-0 max-w-3xl flex-1">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{page.title}</h1>
        <p className="mt-2 text-lg text-muted text-pretty">{page.summary}</p>

        <div className="mt-8">
          <DocBodyView body={body} />
        </div>

        <nav className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm">
          {prev ? (
            <Link href={prev.slug ? `/docs/${prev.slug}` : "/docs"} className="btn-outline btn-md">
              <IconArrowLeft size={14} /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.slug ? `/docs/${next.slug}` : "/docs"} className="btn-outline btn-md">
              {next.title} <IconArrowRight size={14} />
            </Link>
          )}
        </nav>
      </article>

      {outline.length > 2 && (
        <aside className="hidden w-56 shrink-0 xl:block">
          <nav className="sticky top-22" aria-label="On this page">
            <p className="eyebrow mb-2">On this page</p>
            <ul className="space-y-1 border-l border-line text-sm">
              {outline.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className={`block border-l border-transparent py-1 pl-3 text-muted transition hover:border-accent hover:text-text ${
                      h.level === 3 ? "pl-6 text-xs" : ""
                    }`}
                  >
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
