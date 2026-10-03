import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/context', () => ({
  requireContext: async () => ({
    userId: 'user-1', user: { name: 'Alex', email: 'alex@example.com' },
    tenant: { id: 'tenant-1', name: 'Design team', slug: 'design-team' },
    role: 'member', memberships: [], canSwitchOrg: false,
  }),
}))

it('opens account settings with the signed-in account and selected workspace', async () => {
  const { default: SettingsPage } = await import('@/app/dashboard/settings/page')
  const html = renderToStaticMarkup(await SettingsPage())
  expect(html).toContain('Account settings')
  expect(html).toContain('alex@example.com')
  expect(html).toContain('Design team')
  expect(html).toContain('member')
  expect(html).toContain('href="/dashboard/people"')
})
