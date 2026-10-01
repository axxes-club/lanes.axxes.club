import type { MenuItem } from './context-menu'
export type PermittedMenuItem = MenuItem & { permission?: string }
export function permittedMenuItems(items: PermittedMenuItem[], permissions: Record<string, boolean>): MenuItem[] {
  const allowed = items.filter((item) => !item.permission || permissions[item.permission])
  return allowed.filter((item, i) => !item.separator || (i > 0 && i < allowed.length - 1 && !allowed[i - 1].separator))
}
export const cardMenuItems = permittedMenuItems
export const listMenuItems = permittedMenuItems
export const boardMenuItems = permittedMenuItems
