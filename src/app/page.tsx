import Link from "next/link"
import { Logo } from "@/components/logo"

export const metadata = {
  title: "Lanes — boards for every team",
  description: "Kanban boards, sprints and pipelines with cards, checklists, assignees and due dates. Part of the AXXES Suite.",
}

const LANES = [
  { name: "To do", cards: [["Draft launch email", "#3b82f6"], ["Book the photographer", "#f59e0b"], ["Update pricing page", ""]] },
  { name: "In progress", cards: [["Checkout redesign", "#8b5cf6"], ["Venue walkthrough", "#10b981"]] },
  { name: "Done", cards: [["Pick event date", ""], ["Hire DJ", "#ef4444"]] },
]

const FEATURES = [
  ["Drag, drop, done", "Move cards between lanes and reorder everything by hand. Dropping into a Done lane completes the card."],
  ["Cards with depth", "Descriptions, checklists with progress, labels, priorities, due dates, assignees, comments and a full activity trail."],
  ["Jira-style keys", "Every card gets a short key like WEB-42 you can say out loud in a stand-up."],
  ["Desktop-class", "Right-click any card or lane, filter by label, person or due date, set WIP limits per lane."],
  ["Your whole week", "My cards collects everything assigned to you across every board, soonest due first."],
  ["Part of AXXES", "Same account and workspaces as the AXXES Suite, where the same boards show up as Projects."],
]

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-muted hover:text-text">Sign in</Link>
          <Link href="/dashboard" className="btn-primary">Open Lanes</Link>
        </nav>
      </header>
      <main>
        <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 lg:pt-24">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[130px]" />
          <p className="relative font-mono text-[11px] uppercase tracking-[0.3em] text-accent">Lanes by AXXES</p>
          <h1 className="relative mx-auto mt-5 max-w-3xl text-5xl font-semibold leading-[1.03] tracking-tight sm:text-7xl">Plan it. Move it. <span className="text-accent">Ship it.</span></h1>
          <p className="relative mx-auto mt-6 max-w-xl text-lg text-muted">Boards, sprints and pipelines for teams who&apos;d rather do the work than manage the tool.</p>
          <div className="relative mt-8 flex justify-center gap-3">
            <Link href="/dashboard" className="btn-primary px-5 py-3 text-base">Start a board</Link>
            <a href="#features" className="btn-ghost px-5 py-3 text-base">See features</a>
          </div>

          <div aria-hidden className="relative mx-auto mt-16 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            {LANES.map((lane) => (
              <div key={lane.name} className="rounded-xl border border-line bg-panel p-3">
                <p className="mb-2 flex justify-between px-1 text-sm font-semibold">{lane.name}<span className="text-muted">{lane.cards.length}</span></p>
                <div className="space-y-2">
                  {lane.cards.map(([t, c]) => (
                    <div key={t} className="rounded-lg border border-line bg-panel-2 p-3 text-sm" style={{ borderLeft: `3px solid ${c || "var(--line)"}` }}>
                      <p className={lane.name === "Done" ? "text-muted line-through" : ""}>{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="border-t border-line/60 bg-panel/40">
          <div className="mx-auto grid max-w-6xl scroll-mt-16 gap-px overflow-hidden px-4 py-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {FEATURES.map(([t, b]) => (
              <div key={t} className="p-6">
                <h3 className="font-medium">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl justify-between px-4 py-8 text-sm text-muted sm:px-6">
          <Logo />
          <a href="https://handshake.axxes.club" className="hover:text-text">All AXXES apps</a>
        </div>
      </footer>
    </div>
  )
}
