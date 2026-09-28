"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cx, Kbd } from "@/components/ui"
import { Avatar } from "@/components/avatar"
import { OrgSwitcher } from "@/components/org-switcher"
import { ProductSwitcher } from "@/components/product-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { SignOut } from "@/components/sign-out"
import { Logo } from "@/components/logo"
import { CommandPalette } from "@/components/command-palette"
import { useCommandPalette } from "@/components/command-palette"
import {
  IconBoard, IconChart, IconClose, IconInbox, IconMenu, IconSearch, IconUsers,
} from "@/components/icons"
import type { Membership } from "@/lib/context"

/**
 * The application shell.
 *
 * Three things live here that used to be scattered: the workspace switcher,
 * the command palette trigger, and the AXXES product switcher. The shell's
 * job is to answer "where am I, and how do I get somewhere else" without
 * scrolling or thinking.
 *
 * The sidebar is collapsible because a board view wants the full width, and
 * someone who never uses the sidebar should not have to look at it. The
 * choice is remembered per browser, not per account — it is a preference
 * about the screen, not about the workspace.
 */

const SIDEBAR_KEY = "lanes.sidebar"

export type ShellNav = { href: string; label: string; Icon: typeof IconBoard }

export const PRIMARY_NAV: ShellNav[] = [
  { href: "/dashboard", label: "Boards", Icon: IconBoard },
  { href: "/dashboard/my-cards", label: "My cards", Icon: IconInbox },
  { href: "/dashboard/insights", label: "Insights", Icon: IconChart },
  { href: "/dashboard/people", label: "People", Icon: IconUsers },
]

export function AppShell({
  membership,
  memberships,
  user,
  children,
}: {
  membership: Membership
  memberships: Membership[]
  user: { name: string; email: string; image?: string | null }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette()

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "collapsed")
    } catch {
      /* private browsing: the default width is fine */
    }
  }, [])

  useEffect(() => setOpen(false), [pathname])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded")
    } catch {
      /* ignore */
    }
  }

  const active = (item: ShellNav) => pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <div className="min-h-dvh lg:flex">
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost btn-icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <IconClose size={18} /> : <IconMenu size={18} />}
        </button>
        <Link href="/dashboard" className="truncate">
          <Logo />
        </Link>
        <button type="button" onClick={() => setPaletteOpen(true)} className="btn-ghost btn-icon" aria-label="Search">
          <IconSearch size={18} />
        </button>
      </header>


      <aside
        className={cx(
          "no-print fixed inset-x-0 bottom-0 top-14 z-20 flex flex-col border-r border-line bg-panel transition-[width] duration-200",
          "lg:sticky lg:top-0 lg:h-dvh lg:shrink-0",
          open ? "block" : "hidden lg:flex",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        <div className={cx("flex h-14 shrink-0 items-center border-b border-line px-3", collapsed && "lg:justify-center lg:px-0")}>
          <Link href="/dashboard" className="min-w-0">
            {collapsed ? (
              <span className="hidden lg:block">
                <LogoMark />
              </span>
            ) : (
              <Logo />
            )}
          </Link>
        </div>

        <div className={cx("flex-1 overflow-y-auto p-3", collapsed && "lg:px-2")}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cx(
              "mb-3 flex w-full items-center gap-2.5 rounded-lg border border-line bg-panel-2 text-sm text-muted transition hover:border-line-strong hover:text-text",
              collapsed ? "justify-center px-2 py-2 lg:h-9" : "px-3 py-2",
            )}
            aria-label="Open command palette"
          >
            <IconSearch size={15} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
              </>
            )}
          </button>

          <nav aria-label="Main" className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} isActive={active(item)} />
            ))}
          </nav>

          <div className="my-4 border-t border-line" />

          <p className={cx("eyebrow mb-2 px-3", collapsed && "lg:sr-only")}>AXXES</p>
          <ProductSwitcher collapsed={collapsed} />
        </div>

        <div className={cx("shrink-0 space-y-2 border-t border-line p-3", collapsed && "lg:px-2")}>
          <OrgSwitcher current={membership} memberships={memberships} collapsed={collapsed} />
          <div className={cx("flex items-center gap-2", collapsed ? "lg:flex-col" : "justify-between")}>
            <Link
              href="/dashboard/settings"
              className={cx("flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-panel-3 hover:text-text", collapsed && "lg:px-0")}
              title={user.email}
            >
              <Avatar name={user.name} src={user.image} size={24} />
              {!collapsed && <span className="min-w-0 flex-1 truncate">{user.name || user.email}</span>}
            </Link>
            <div className={cx("flex items-center gap-0.5", collapsed && "lg:flex-col")}>
              <ThemeToggle />
              <SignOut />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[68px] hidden size-6 place-items-center rounded-full border border-line bg-panel text-muted transition hover:text-text lg:grid"
        >
          <span className="text-[10px] leading-none">{collapsed ? "›" : "‹"}</span>
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[110rem] px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}

function NavLink({ item, collapsed, isActive }: { item: ShellNav; collapsed: boolean; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cx(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
        isActive ? "bg-panel-3 font-medium text-text" : "text-muted hover:bg-panel-3 hover:text-text",
        collapsed && "lg:justify-center lg:px-0",
      )}
    >
      <item.Icon size={16} className={cx("shrink-0", isActive && "text-accent")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

function LogoMark() {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-accent font-mono text-sm font-bold text-accent-fg">
      L
    </span>
  )
}
