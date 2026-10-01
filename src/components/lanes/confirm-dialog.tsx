"use client"
import { useEffect, useRef } from 'react'
export function ConfirmDialog({ open, title, description, pending, onConfirm, onClose }: { open: boolean; title: string; description: string; pending: boolean; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; if (open && dialog && !dialog.open) dialog.showModal(); else if (!open && dialog?.open) dialog.close() }, [open])
  return <dialog ref={ref} onCancel={(e) => { e.preventDefault(); if (!pending) onClose() }} aria-labelledby="confirmation-title" className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-6 text-text backdrop:bg-black/50">
    <h2 id="confirmation-title" className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-muted">{description}</p>
    <div className="mt-6 flex justify-end gap-2"><button type="button" autoFocus className="btn-ghost" disabled={pending} onClick={onClose}>Cancel</button><button type="button" className="btn bg-danger text-white" disabled={pending} onClick={onConfirm}>{pending ? 'Working…' : 'Confirm'}</button></div>
  </dialog>
}
