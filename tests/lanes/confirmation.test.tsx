// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from '@/components/lanes/confirm-dialog'
beforeAll(() => { HTMLDialogElement.prototype.showModal=function(){this.open=true}; HTMLDialogElement.prototype.close=function(){this.open=false} })
afterEach(cleanup)
it('waits for confirmation and disables actions while pending', () => {
 const action=vi.fn(),close=vi.fn()
 const props={open:true,title:'Delete card?',description:'Remove this card.',pending:false,onConfirm:action,onClose:close}
 const {rerender}=render(<ConfirmDialog {...props} />)
 expect(action).not.toHaveBeenCalled()
 fireEvent.click(screen.getByText('Cancel'));expect(close).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByText('Confirm'));expect(action).toHaveBeenCalledTimes(1)
 rerender(<ConfirmDialog {...props} pending />)
 fireEvent.click(screen.getByText('Working…'));expect(action).toHaveBeenCalledTimes(1)
})
