import { TEMPLATES } from "@/lib/lanes/templates"
import { IconArrowRight } from "@/components/icons"
import { NewBoardLauncher } from "@/components/new-board"

/**
 * The template gallery.
 *
 * Nine templates is enough that the choice deserves to be browsable rather
 * than buried in a dropdown, and a screenshot-free wireframe of the lanes is
 * more useful than a paragraph describing them. Each card shows the real lane
 * names from the registry, so what you pick is what you get.
 */
export function TemplateGallery() {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="eyebrow">Start from a template</h2>
          <p className="mt-1 text-sm text-muted">
            Lanes, labels and a key prefix, set up the way the team would say it out loud.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <article key={t.key} className="card card-hover flex flex-col p-5">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full" style={{ background: t.accent }} aria-hidden />
              <h3 className="font-semibold tracking-tight">{t.name}</h3>
            </div>
            <p className="mt-2 text-sm text-muted text-pretty">{t.bestFor}</p>

            {/* A wireframe of the lanes, so the shape is visible at a glance. */}
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {t.lists.slice(0, 5).map((l) => (
                <div key={l.name} className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 p-1.5">
                  <span
                    className="block truncate text-[9px] font-medium"
                    style={{ color: l.done ? "var(--success)" : "var(--muted)" }}
                  >
                    {l.name}
                  </span>
                  <span className="mt-1 block h-1 rounded-full bg-line" />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {t.labels.slice(0, 4).map((l) => (
                <span
                  key={l.name}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ background: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {t.labels.length === 0 && <span className="text-[10px] text-faint">No labels</span>}
            </div>

            <div className="mt-5 flex-1" />
            <NewBoardLauncher templateKey={t.key} accent={t.accent} name={`${t.name} board`}>
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                Use this template <IconArrowRight size={14} />
              </span>
            </NewBoardLauncher>
          </article>
        ))}
      </div>
    </section>
  )
}
