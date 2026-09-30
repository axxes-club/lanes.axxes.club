import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ context: vi.fn(), permissions: vi.fn(), rows: [] as unknown[], select: vi.fn(), write: vi.fn() }))
vi.mock('@/lib/context', () => ({ requireContext: mock.context }))
vi.mock('@/lib/lanes/board-access', () => ({ boardAccess: vi.fn(async () => ({ role: 'viewer', elevated: false, permissions: mock.permissions })) }))
vi.mock('@/lib/db', async () => {
  const schema = await import('../../src/lib/db/schema')
  return { schema, db: { select: mock.select, update: mock.write } }
})
import { requireBoard, requireCard } from '@/lib/lanes/access'
beforeEach(() => {
  vi.clearAllMocks()
  mock.context.mockResolvedValue({ userId: 'user', tenant: { id: 'tenant' } })
  mock.permissions.mockReturnValue(true)
  mock.rows = [{ id: 'board', tenantId: 'tenant' }]
  const q: Record<string, unknown> = {}
  for (const method of ['from', 'innerJoin', 'where']) q[method] = vi.fn(() => q)
  q.limit = vi.fn(async () => mock.rows)
  mock.select.mockReturnValue(q)
})
it('returns an authorized tenant board', async () => { expect((await requireBoard('board', 'board.update')).project.id).toBe('board') })
it('rejects missing, foreign-tenant, and deleted boards before permissions', async () => {
  mock.rows = []
  await expect(requireBoard('foreign', 'board.update')).rejects.toMatchObject({ status: 404 })
  expect(mock.permissions).not.toHaveBeenCalled()
  expect(mock.write).not.toHaveBeenCalled()
})
it('rejects denied or revoked permissions without writes', async () => {
  mock.permissions.mockReturnValue(false)
  await expect(requireBoard('board', 'board.update')).rejects.toMatchObject({ status: 403 })
  expect(mock.write).not.toHaveBeenCalled()
})
it('rejects missing session before any database query', async () => {
  mock.context.mockRejectedValue(new Error('No session'))
  await expect(requireBoard('board', 'board.read')).rejects.toThrow('No session')
  expect(mock.select).not.toHaveBeenCalled()
})
it('checks the actual card board and requested capability', async () => {
  mock.rows = [{ project: { id: 'board' }, card: { id: 'card' } }]
  expect((await requireCard('card', 'card.assign')).card.id).toBe('card')
  expect(mock.permissions).toHaveBeenCalledWith('card.assign')
})
it('rejects missing, deleted or foreign cards before permission lookup', async () => {
  mock.rows = []
  await expect(requireCard('foreign', 'card.update')).rejects.toMatchObject({ status: 404 })
  expect(mock.permissions).not.toHaveBeenCalled()
})
