import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { DOC_NAV } from "@/lib/docs/nav"
import { product } from "@/product.config"

/**
 * The docs shell.
 *
 * Deliberately not inside the app shell. A person reading documentation is
 * not working, and putting a workspace sidebar next to an API reference
 * invites them to click into a board mid-sentence. The only shared furniture
 * is the logo, the theme toggle and a link back to sign in.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[92rem] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <span className="hidden rounded-full bg-panel-3 px-2.5 py-1 text-[11px] font-medium text-muted sm:inline">
            Docs
          </span>
          <nav className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="btn-ghost btn-sm">
              Open Lanes
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-[92rem] gap-10 px-4 py-8 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-22 space-y-7" aria-label="Documentation">
            {DOC_NAV.map((section) => (
              <div key={section.title}>
                <p className="eyebrow mb-2">{section.title}</p>
                <ul className="space-y-0.5">
                  {section.pages.map((page) => (
                    <li key={page.slug || "index"}>
                      <DocLink slug={page.slug} title={page.title} summary={page.summary} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <p>
            {product.name} &middot; part of the AXXES suite.{" "}
            <a href="https://handshake.axxes.club" className="hover:text-text">
              All apps
            </a>
          </p>
          <p className="font-mono text-xs">API v1 &middot; 2026-09-01</p>
        </div>
      </footer>
    </div>
  )
}

function DocLink({ slug, title, summary }: { slug: string; title: string; summary: string }) {
  return (
    <Link
      href={slug ? `/docs/${slug}` : "/docs"}
      title={summary}
      className="block rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-panel-2 hover:text-text"
    >
      {title}
    </Link>
  )
}
