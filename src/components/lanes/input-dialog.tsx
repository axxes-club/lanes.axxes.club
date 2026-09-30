"use client"
import { useEffect, useRef, useState } from 'react'
export function InputDialog({ title, initial, type = 'text', pending, onSave, onClose }: { title: string; initial: string; type?: 'text' | 'number'; pending: boolean; onSave: (value: string) => Promise<void>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [value, setValue] = useState(initial), [error, setError] = useState('')
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); if (!pending) onClose() }} className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-6 text-text backdrop:bg-black/50">
    <form onSubmit={async (e) => { e.preventDefault(); setError(''); try { await onSave(value); onClose() } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Try again.') } }}>
      <h2 className="text-lg font-semibold">{title}</h2><label className="mt-4 block text-sm">{title}<input autoFocus className="input mt-2 w-full" type={type} value={value} onChange={(e) => setValue(e.target.value)} maxLength={100} min={1} max={99} /></label>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-ghost" disabled={pending} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={pending}>Save</button></div>
    </form>
  </dialog>
}
