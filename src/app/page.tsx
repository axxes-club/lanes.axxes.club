import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { SUITE } from "@/lib/axxes/suite"
import { TEMPLATES } from "@/lib/lanes/templates"
import { product } from "@/product.config"
import {
  IconArrowRight, IconBoard, IconChart, IconCheck, IconClose, IconCode, IconCommand,
  IconInbox, IconLayers, IconLink, IconPalette, IconSearch, IconStar, IconTarget, IconUsers, IconZap,
} from "@/components/icons"

export const metadata = {
  title: `${product.name} — the delivery workspace for teams that ship`,
  description: product.description,
}

/**
 * The marketing page.
 *
 * Written to be believed rather than believed-about. The competitor table
 * below is the interesting part: every claim in it is something Lanes actually
 * does today, and the two columns that are not "we win" are honest about what
 * the other tools are genuinely better at. A comparison page that claims to
 * win every row is a page nobody believes, and one that loses a row nobody
 * reads is a page nobody forwards.
 */

type Cell = string | true

const COMPARISON: { feature: string; lanes: Cell; jira: Cell; monday: Cell; trello: Cell }[] = [
  { feature: "Command palette to reach anything", lanes: true, jira: "Partial", monday: "Partial", trello: "No" },
  { feature: "Permission model", lanes: "8 board roles", jira: "Configurable, complex", monday: "Basic", trello: "Paid" },
  { feature: "Card keys you can say out loud", lanes: true, jira: true, monday: "No", trello: "No" },
  { feature: "Sprint commitment controls", lanes: "PO + SM only", jira: "Everyone", monday: "Everyone", trello: "Everyone" },
  { feature: "One permission table, everywhere", lanes: true, jira: "No", monday: "No", trello: "No" },
  { feature: "Time tracking per card", lanes: true, jira: "Paid", monday: "Paid", trello: "Paid" },
  { feature: "REST API", lanes: true, jira: true, monday: "Paid", trello: "Paid" },
  { feature: "Published API documentation", lanes: true, jira: true, monday: "No", trello: "No" },
  { feature: "Scrum poker with blind voting", lanes: true, jira: "App", monday: "App", trello: "App" },
  { feature: "Delivery analytics included", lanes: true, jira: "Paid", monday: "Paid", trello: "No" },
  { feature: "Custom fields", lanes: "Coming", jira: true, monday: "Paid", trello: "Paid" },
  { feature: "Native chat, docs and CI in one suite", lanes: true, jira: "Apps", monday: "Apps", trello: "No" },
]

const DRAWN_NAV: { label: string; Icon: typeof IconBoard; active: boolean }[] = [
  { label: "Boards", Icon: IconBoard, active: true },
  { label: "My cards", Icon: IconInbox, active: false },
  { label: "Insights", Icon: IconChart, active: false },
  { label: "People", Icon: IconUsers, active: false },
]

const FEATURES: { title: string; body: string; Icon: typeof IconBoard }[] = [
  { title: "Reach anything in one keystroke", Icon: IconCommand, body: "⌘K opens boards, cards, people, commands and every other AXXES app. It opens from inside a text field, because if you reached for the palette you did not mean to be typing there." },
  { title: "Keys, not ids", Icon: IconTarget, body: "Every card gets WEB-42. Stable across export, import and a change of database. The API takes a key, and unpadded AB-7 and AB-07 both work." },
  { title: "Eight roles, one table", Icon: IconUsers, body: "The board, the card panel, the API and every webhook consult the same permission table, so two screens can never disagree about the same person." },
  { title: "Estimation that stays honest", Icon: IconChart, body: "Nobody sees a vote until everybody has answered or the facilitator reveals. Without that rule the first hand raised anchors the room and the session is theatre." },
  { title: "Numbers you can click through", Icon: IconLayers, body: "Throughput, lead time, WIP, aging. Every figure links to the cards that produced it, because a metric you cannot open is a number nobody trusts." },
  { title: "Dark and light, done properly", Icon: IconPalette, body: "Two designed themes rather than one inverted. Follows your system by default, remembers your choice, and respects reduced motion." },
]

export default function Home() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="grid-bg radial-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_50%_at_50%_0%,var(--accent-glow),transparent)]" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <Link
            href="/docs"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-text"
          >
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">New</span>
            The API is documented and rate-limited
            <IconArrowRight size={12} />
          </Link>

          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-7xl">
            The delivery workspace
            <br />
            <span className="accent-gradient">your whole company already has</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted text-pretty sm:text-xl">
            Boards, sprints, poker and analytics with a keyboard-first interface — sharing one account, one workspace and
            one database with the rest of AXXES. No connectors to keep alive, no second login, nothing to go stale.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="btn-primary btn-lg w-full sm:w-auto">
              Create a workspace <IconArrowRight size={16} />
            </Link>
            <Link href="/sign-in" className="btn-outline btn-lg w-full sm:w-auto">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-faint">Free for small teams. No credit card.</p>
        </div>

        {/* The product, drawn rather than screenshotted. */}
        <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <ProductShot />
        </div>
      </section>

      {/* ── The claim, made checkable ────────────────────────────────── */}
      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The difference</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Every other tool is something you connect.
            </h2>
            <p className="mt-4 text-muted text-pretty">
              Jira integrates with Slack. Monday integrates with GitHub. Lanes and Members are the same workspace reading
              the same rows — which is why a card can show a live stock level without a sync job, and why one sign-in
              covers the whole suite.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            <Claim
              Icon={IconLink}
              title="No API keys to wire"
              body="Boards in Lanes are Projects in the suite. The same rows, not a copy. Nothing can fall out of sync because there is nothing to sync."
            />
            <Claim
              Icon={IconZap}
              title="Nothing to go stale"
              body="A customer, an order or a stock item linked to a card is the live row. There is no cache to expire and no connector to break."
            />
            <Claim
              Icon={IconUsers}
              title="One identity, one role model"
              body="Sign in once at Handshake and every app on *.axxes.club shares the session — including the permissions."
            />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">Built for the work</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Fast enough that you stop noticing it.
          </h2>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <div className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                <f.Icon size={17} />
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Templates ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Start from how you already talk</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Nine templates. Every one of them is data, not code.
            </h2>
            <p className="mt-4 text-muted text-pretty">
              A template is lanes, labels and a key prefix. Adding one to the product adds it to the API with no change
              to the API — and one workspace&apos;s board can become another&apos;s template.
            </p>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.filter((t) => t.key !== "blank").map((t) => (
              <div key={t.key} className="card p-5">
                <div className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full" style={{ background: t.accent }} aria-hidden />
                  <h3 className="font-semibold tracking-tight">{t.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted text-pretty">{t.bestFor}</p>
                <div className="mt-4 flex gap-1.5" aria-hidden>
                  {t.lists.slice(0, 5).map((l) => (
                    <span key={l.name} className="min-w-0 flex-1 truncate rounded border border-line bg-panel-2 px-1.5 py-1 text-[9px] text-muted">
                      {l.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">Compared honestly</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Where Lanes wins, and where it does not.
          </h2>
          <p className="mt-4 text-muted text-pretty">
            Two rows below are not wins. Jira&apos;s configurability and Monday&apos;s visual builder are genuinely better
            than what Lanes does today, and a comparison that never admits that is not a comparison.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-2/5 py-3 text-left font-medium text-muted">Capability</th>
                <th scope="col" className="py-3 text-center font-semibold text-text">Lanes</th>
                <th scope="col" className="py-3 text-center font-medium text-muted">Jira</th>
                <th scope="col" className="py-3 text-center font-medium text-muted">Monday</th>
                <th scope="col" className="py-3 text-center font-medium text-muted">Trello</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-line-soft">
                  <th scope="row" className="py-3 pr-4 text-left font-normal text-text-2">{row.feature}</th>
                  <td className="py-3 text-center">
                    <Cell value={row.lanes} highlight />
                  </td>
                  <td className="py-3 text-center text-muted"><Cell value={row.jira} /></td>
                  <td className="py-3 text-center text-muted"><Cell value={row.monday} /></td>
                  <td className="py-3 text-center text-muted"><Cell value={row.trello} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Developer ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-panel/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow">For developers</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              An API that tells you what went wrong.
            </h2>
            <p className="mt-4 text-muted text-pretty">
              Every response is either <code className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[0.85em]">{"{ data }"}</code> or{" "}
              <code className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[0.85em]">{"{ error }"}</code> — never a third
              shape. And every error carries a hint written for whoever is holding the request at 01:00.
            </p>
            <pre className="code mt-6" data-lang="json">
{`{
  "error": {
    "message": "This token cannot write.",
    "code": "forbidden",
    "hint": "Issue a token with the write scope.",
    "requestId": "req_muly4whn000"
  }
}`}
            </pre>
            <Link href="/docs" className="btn-outline btn-lg mt-6">
              <IconCode size={15} /> Read the docs
            </Link>
          </div>

          <div className="space-y-4">
            <Mini
              Icon={IconSearch}
              title="One search, three surfaces"
              body="The command palette, the search page and /api/v1/search call the same function. Two surfaces with their own query would rank the same board differently."
            />
            <Mini
              Icon={IconUsers}
              title="A token is a person"
              body="Tokens resolve to their owner's board role. A script can do exactly what its owner could and not one thing more, which is what makes one safe to hand out."
            />
            <Mini
              Icon={IconInbox}
              title="Rate limits per token"
              body="Not per IP. An IP limit punishes an office of fifty people sharing one address, which is the normal shape of a team tool."
            />
          </div>
        </div>
      </section>

      {/* ── Suite ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">Part of AXXES</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            One sign-in. The whole family.
          </h2>
          <p className="mt-4 text-muted text-pretty">
            Your session follows you across every <code className="rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[0.85em]">*.axxes.club</code>{" "}
            app, so checking on an order does not mean signing in again.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SUITE.map((p) => (
            <a
              key={p.key}
              href={p.self ? "/dashboard" : p.href}
              target={p.self ? undefined : "_blank"}
              rel={p.self ? undefined : "noreferrer"}
              className="card card-hover p-4"
            >
              <span
                className="grid size-9 place-items-center rounded-lg text-xs font-bold"
                style={{ background: `${p.accent}1f`, color: p.accent }}
                aria-hidden
              >
                {p.glyph}
              </span>
              <p className="mt-3 text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{p.blurb}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-panel/40">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Open a board in ninety seconds.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted text-pretty">
            Pick a template, invite the team, and the lanes and labels are already right. No credit card, and nothing to
            uninstall later.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className="btn-primary btn-lg w-full sm:w-auto">
              Create a workspace <IconArrowRight size={16} />
            </Link>
            <Link href="/sign-in" className="btn-outline btn-lg w-full sm:w-auto">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/docs" className="btn-ghost btn-sm">Docs</Link>
          <Link href="/docs/permissions" className="btn-ghost btn-sm">Permissions</Link>
          <Link href="/docs/migration" className="btn-ghost btn-sm">Migrate</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/sign-in" className="btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
          <Link href="/sign-up" className="btn-primary btn-sm">Start free</Link>
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted text-pretty">
            {product.tagline} Part of the AXXES suite — one account across every app.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:gap-14">
          <div>
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/sign-up" className="hover:text-text">Start free</Link></li>
              <li><Link href="/sign-in" className="hover:text-text">Sign in</Link></li>
              <li><Link href="/docs/quickstart" className="hover:text-text">Quickstart</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Developers</p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/docs" className="hover:text-text">Documentation</Link></li>
              <li><Link href="/docs/openapi" className="hover:text-text">API reference</Link></li>
              <li><a href="https://handshake.axxes.club" className="hover:text-text">All AXXES apps</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-faint sm:px-6">
          {product.name} · AXXES. Cards and boards in Lanes are Projects in the suite — the same rows, not a copy.
        </div>
      </div>
    </footer>
  )
}

function Claim({ Icon, title, body }: { Icon: typeof IconLink; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon size={17} />
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">{body}</p>
    </div>
  )
}

function Mini({ Icon, title, body }: { Icon: typeof IconSearch; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon size={15} />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted text-pretty">{body}</p>
        </div>
      </div>
    </div>
  )
}

/** A cell in the comparison table. `true` means "yes, and it is a differentiator". */
function Cell({ value, highlight = false }: { value: string | true; highlight?: boolean }) {
  if (value === true) {
    return <IconCheck size={16} className={highlight ? "mx-auto text-success" : "mx-auto text-muted"} aria-label="Yes" />
  }
  if (value === "No") {
    return <IconClose size={15} className="mx-auto text-faint" aria-label="No" />
  }
  return <span className="text-xs">{value}</span>
}

/**
 * A drawn board.
 *
 * A screenshot would be a lie the moment the UI changed, and would be
 * unreadable on a phone. Drawing it in HTML means it is always current,
 * always crisp, and costs no image weight.
 */
function ProductShot() {
  const lanes = [
    { name: "To do", tint: "var(--muted)", cards: [
      { key: "WEB-42", title: "Rewrite the pricing page", labels: [["Feature", "#3b82f6"]] },
      { key: "WEB-51", title: "Checkout times out on Safari", labels: [["Bug", "#ef4444"], ["Blocked", "#f59e0b"]] },
    ] },
    { name: "In progress", tint: "var(--accent)", cards: [
      { key: "WEB-38", title: "Rate limit the public API", labels: [["Feature", "#3b82f6"]] },
      { key: "WEB-44", title: "Keyboard shortcuts for the board", labels: [["Design", "#8b5cf6"]] },
    ] },
    { name: "Done", tint: "var(--success)", cards: [
      { key: "WEB-29", title: "Tokens: fix the uuid primary key", labels: [["Bug", "#ef4444"]] },
    ] },
  ]

  return (
    <div className="card overflow-hidden shadow-lg">
      <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-danger/60" aria-hidden />
        <span className="size-2.5 rounded-full bg-warning/60" aria-hidden />
        <span className="size-2.5 rounded-full bg-success/60" aria-hidden />
        <div className="ml-3 flex items-center gap-2 rounded-md bg-panel px-3 py-1 text-[11px] text-faint">
          <IconSearch size={11} /> lanes.axxes.app/dashboard
        </div>
      </div>

      <div className="grid min-h-0 sm:grid-cols-[13rem_1fr]">
        <div className="hidden border-r border-line bg-panel-2 p-3 sm:block">
          <div className="flex items-center gap-2 rounded-lg bg-panel px-2.5 py-1.5 text-xs text-muted">
            <IconSearch size={12} /> Search… <span className="ml-auto rounded border border-line px-1 text-[9px]">⌘K</span>
          </div>
          <nav className="mt-3 space-y-0.5 text-xs">
            {DRAWN_NAV.map(({ Icon, label, active }) => (
              <span
                key={label}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${active ? "bg-panel text-text" : "text-muted"}`}
              >
                <Icon size={13} />
                {label}
              </span>
            ))}
          </nav>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
            <span className="text-sm font-semibold">Website relaunch</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-[10px] font-medium text-accent">
              <IconTarget size={10} /> Sprint 4 · 6d left
            </span>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {lanes.map((lane) => (
              <div key={lane.name} className="rounded-lg border border-line bg-panel-2 p-2">
                <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium">
                  <span className="size-1.5 rounded-full" style={{ background: lane.tint }} aria-hidden />
                  {lane.name}
                  <span className="ml-auto text-[10px] text-faint">{lane.cards.length}</span>
                </p>
                <div className="space-y-1.5">
                  {lane.cards.map((c) => (
                    <div key={c.key} className="rounded-md border border-line bg-panel p-2">
                      <div className="mb-1 flex gap-1">
                        {c.labels.map(([name, colour]) => (
                          <span key={name} className="rounded px-1 py-0.5 text-[8px] font-semibold text-white" style={{ background: colour }}>
                            {name}
                          </span>
                        ))}
                      </div>
                      <p className={`text-[11px] leading-snug ${lane.name === "Done" ? "text-muted line-through" : ""}`}>{c.title}</p>
                      <p className="mt-1 font-mono text-[9px] text-faint">{c.key}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
