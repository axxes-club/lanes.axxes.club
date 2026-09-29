import { cx, colorFor, initials } from "@/components/ui"

/**
 * An avatar.
 *
 * Deterministic colour from the person's id or name, so the same person is
 * the same colour on every board. A real image wins when there is one, but
 * the initials fallback is the common case in AXXES workspaces, where many
 * accounts have no avatar uploaded.
 */
export function Avatar({
  name,
  src,
  size = 24,
  className,
  ring = true,
  title,
}: {
  name: string | null | undefined
  src?: string | null
  size?: number
  className?: string
  ring?: boolean
  title?: string
}) {
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)) }
  return (
    <span
      className={cx(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white",
        ring && "ring-2 ring-panel",
        className,
      )}
      style={{ ...style, background: colorFor(name ?? "?") }}
      title={title ?? name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar hosts are arbitrary, and next/image would need a remote pattern per integration
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}

/** Overlapping avatars with a +N overflow, the way every good inbox does it. */
export function AvatarStack({
  people,
  max = 4,
  size = 24,
}: {
  people: { id: string; name: string | null; image?: string | null }[]
  max?: number
  size?: number
}) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className="flex -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} src={p.image} size={size} />
      ))}
      {rest > 0 && (
        <span
          className="inline-grid place-items-center rounded-full bg-panel-3 font-semibold text-muted ring-2 ring-panel"
          style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) }}
          title={people.slice(max).map((p) => p.name).join(", ")}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
