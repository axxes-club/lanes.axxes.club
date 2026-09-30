"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export type MenuItem =
  | { separator: true }
  | { label: string; onSelect?: () => void; children?: MenuItem[]; danger?: boolean; disabled?: boolean; checked?: boolean; shortcut?: string; separator?: false }

export function ContextMenu({ x, y, items, onClose, trigger }: { x: number; y: number; items: MenuItem[]; onClose: () => void; trigger?: HTMLElement | null }) {
  const previous = useRef(trigger ?? (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null))
  const root = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) closeRef.current() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current() } }
    const resize = () => closeRef.current()
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape, true)
      window.removeEventListener('resize', resize)
      previous.current?.focus()
    }
  }, [trigger])
  return createPortal(<div ref={root} data-context-menu><MenuLevel x={x} y={y} items={items} close={() => closeRef.current()} /></div>, document.body)
}

function MenuLevel({ x, y, items, close, back }: { x: number; y: number; items: MenuItem[]; close: () => void; back?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const [pos, setPos] = useState({ x, y })
  const [sub, setSub] = useState<{ index: number; x: number; y: number } | null>(null)
  const enabled = items.flatMap((item, i) => item.separator || item.disabled ? [] : [i])
  useLayoutEffect(() => {
    const bounds = ref.current?.getBoundingClientRect()
    if (bounds) setPos({ x: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8)) })
    buttons.current.get(enabled[0])?.focus()
  }, [x, y]) // Items remain fixed for the lifetime of an open menu.
  function open(index: number) {
    const item = items[index]
    if (!item || item.separator || item.disabled || !item.children) return
    const bounds = buttons.current.get(index)?.getBoundingClientRect()
    if (!bounds) return
    const width = Math.min(240, window.innerWidth - 16)
    setSub({ index, x: bounds.right + width + 8 > window.innerWidth ? bounds.left - width : bounds.right, y: bounds.top })
  }
  function activate(index: number) {
    const item = items[index]
    if (!item || item.separator || item.disabled) return
    if (item.children) return open(index)
    item.onSelect?.()
    close()
  }
  return <>
    <div ref={ref} role="menu" aria-label={back ? 'Actions submenu' : 'Actions'} className="fixed z-[70] w-60 overflow-y-auto rounded-lg border border-line bg-panel p-1 text-sm shadow-2xl" style={{ left: pos.x, top: pos.y, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100dvh - 16px)' }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((item, index) => item.separator ? <div key={index} role="separator" className="my-1 h-px bg-line" /> :
        <button key={index} ref={(node) => { if (node) buttons.current.set(index, node); else buttons.current.delete(index) }} type="button" role={item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'} aria-checked={item.checked !== undefined ? item.checked : undefined} aria-haspopup={item.children ? 'menu' : undefined} aria-expanded={item.children ? sub?.index === index : undefined} disabled={item.disabled} tabIndex={-1}
          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-panel-2 focus:bg-panel-2 focus:outline-none disabled:opacity-40 ${item.danger ? 'text-danger' : ''}`}
          onClick={() => activate(index)} onKeyDown={(event) => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight', 'ArrowLeft', 'Enter', ' ', 'Tab'].includes(event.key)) event.stopPropagation()
            let next: number | undefined
            const current = enabled.indexOf(index)
            if (event.key === 'ArrowDown') next = enabled[(current + 1) % enabled.length]
            if (event.key === 'ArrowUp') next = enabled[(current - 1 + enabled.length) % enabled.length]
            if (event.key === 'Home') next = enabled[0]
            if (event.key === 'End') next = enabled.at(-1)
            if (next !== undefined) { event.preventDefault(); buttons.current.get(next)?.focus() }
            if (event.key === 'ArrowRight') { event.preventDefault(); open(index) }
            if (event.key === 'ArrowLeft' && back) { event.preventDefault(); back() }
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(index) }
            if (event.key === 'Tab') { event.preventDefault(); close() }
          }}>
          <span className="w-3 text-accent">{item.checked ? '✓' : ''}</span><span className="flex-1">{item.label}</span>{item.shortcut && <span aria-hidden className="text-xs text-muted">{item.shortcut}</span>}{item.children && <span aria-hidden>›</span>}
        </button>)}
    </div>
    {sub && !items[sub.index].separator && <MenuLevel x={sub.x} y={sub.y} items={(items[sub.index] as Exclude<MenuItem, { separator: true }>).children ?? []} close={close} back={() => { const index = sub.index; setSub(null); buttons.current.get(index)?.focus() }} />}
  </>
}
