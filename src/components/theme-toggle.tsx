"use client"

import { useCallback, useEffect, useState } from "react"
import { IconMonitor, IconMoon, IconSun } from "@/components/icons"
import { cx } from "@/components/ui"

export type Theme = "dark" | "light" | "system"

/**
 * Theme handling.
 *
 * Three states, not two: a person who has never chosen should follow their
 * operating system, and a person who has chosen "system" should be able to
 * change it back. The value lives in localStorage and is mirrored onto
 * <html data-theme> by an inline script in the document head so the first
 * paint is already correct.
 */

export const THEME_KEY = "lanes.theme"
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

function resolve(theme: Theme): "dark" | "light" {
  return theme === "system" ? systemTheme() : theme
}

export function applyTheme(theme: Theme) {
  const resolved = resolve(theme)
  document.documentElement.dataset.theme = resolved
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* private browsing: the theme just will not persist */
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system")

  useEffect(() => {
    let stored: Theme = "system"
    try {
      const raw = localStorage.getItem(THEME_KEY)
      if (raw === "dark" || raw === "light" || raw === "system") stored = raw
    } catch {
      /* ignore */
    }
    setTheme(stored)
  }, [])

  // Follow the OS while the person has not overridden it.
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const onChange = () => applyTheme("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : prev === "light" ? "system" : "dark"
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, setTheme: (t: Theme) => { setTheme(t); applyTheme(t) }, cycle }
}

const ORDER: { value: Theme; label: string; Icon: typeof IconSun }[] = [
  { value: "light", label: "Light", Icon: IconSun },
  { value: "dark", label: "Dark", Icon: IconMoon },
  { value: "system", label: "System", Icon: IconMonitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycle } = useTheme()
  const current = ORDER.find((o) => o.value === theme) ?? ORDER[2]
  const Icon = current.Icon

  return (
    <button
      type="button"
      onClick={cycle}
      className={cx("btn-ghost btn-icon", className)}
      aria-label={`Theme: ${current.label}. Click to change.`}
      title={`Theme: ${current.label}`}
    >
      <Icon size={16} />
    </button>
  )
}
