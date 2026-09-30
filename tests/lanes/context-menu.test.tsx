// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ContextMenu } from '@/components/lanes/context-menu'
afterEach(cleanup)
it('focuses first item and navigates enabled items with arrows and boundaries', () => {
 render(<ContextMenu x={10} y={10} onClose={vi.fn()} items={[{label:'First'}, {separator:true}, {label:'Disabled', disabled:true}, {label:'Last'}]} />)
 expect(document.activeElement).toBe(screen.getByRole('menuitem', {name:/First/}))
 fireEvent.keyDown(document.activeElement!, {key:'ArrowDown'})
 expect(document.activeElement).toBe(screen.getByRole('menuitem', {name:/Last/}))
 fireEvent.keyDown(document.activeElement!, {key:'Home'})
 expect(document.activeElement).toBe(screen.getByRole('menuitem', {name:/First/}))
 fireEvent.keyDown(document.activeElement!, {key:'End'})
 expect(document.activeElement).toBe(screen.getByRole('menuitem', {name:/Last/}))
})
it('opens and closes a submenu with keyboard and executes once', () => {
 const select=vi.fn(), close=vi.fn()
 render(<ContextMenu x={10} y={10} onClose={close} items={[{label:'Move',children:[{label:'Done',onSelect:select}]}]} />)
 fireEvent.keyDown(screen.getByRole('menuitem', {name:/Move/}), {key:'ArrowRight'})
 expect(document.activeElement).toBe(screen.getByRole('menuitem', {name:/Done/}))
 fireEvent.keyDown(document.activeElement!, {key:'ArrowLeft'})
 expect(document.activeElement).toBe(screen.getByRole('menuitem', {name:/Move/}))
 fireEvent.keyDown(document.activeElement!, {key:'ArrowRight'})
 fireEvent.keyDown(document.activeElement!, {key:'Enter'})
 expect(select).toHaveBeenCalledTimes(1)
 expect(close).toHaveBeenCalledTimes(1)
})
it('clamps negative coordinates and dismisses on Escape', () => {
 const close=vi.fn()
 render(<ContextMenu x={-20} y={-20} onClose={close} items={[{label:'First'}]} />)
 const menu=screen.getByRole('menu')
 expect(parseFloat(menu.style.left)).toBeGreaterThanOrEqual(8)
 expect(parseFloat(menu.style.top)).toBeGreaterThanOrEqual(8)
 fireEvent.keyDown(menu,{key:'Escape'})
 expect(close).toHaveBeenCalledTimes(1)
})
it('restores trigger focus after unmount and supports pointer execution', () => {
 const button=document.createElement('button');document.body.append(button);button.focus()
 const select=vi.fn();const {unmount}=render(<ContextMenu x={9999} y={9999} items={[{label:'Execute',onSelect:select}]} onClose={vi.fn()} />)
 fireEvent.click(screen.getByRole('menuitem'))
 expect(select).toHaveBeenCalledTimes(1)
 expect(parseFloat(screen.getByRole('menu').style.left)).toBeLessThanOrEqual(window.innerWidth-8)
 unmount(); expect(document.activeElement).toBe(button);button.remove()
})
it('dismisses outside and prevents disabled pointer actions', () => {
 const close=vi.fn(), select=vi.fn()
 render(<ContextMenu x={0} y={0} onClose={close} items={[{label:'Disabled', disabled:true,onSelect:select},{label:'Enabled'}]} />)
 fireEvent.click(screen.getByRole('menuitem',{name:/Disabled/}));expect(select).not.toHaveBeenCalled()
 fireEvent.pointerDown(document.body);expect(close).toHaveBeenCalledTimes(1)
})

it('keeps menu Enter away from board shortcuts and excludes decorative shortcut names', () => {
 const shortcut=vi.fn();window.addEventListener('keydown',shortcut)
 try {
 render(<ContextMenu x={10} y={10} onClose={vi.fn()} items={[{label:'Move',shortcut:'↵',children:[{label:'Done'}]}]} />)
 fireEvent.keyDown(screen.getByRole('menuitem',{name:'Move',exact:true}),{key:'Enter'})
 expect(shortcut).not.toHaveBeenCalled()
 } finally {window.removeEventListener('keydown',shortcut)}
})
