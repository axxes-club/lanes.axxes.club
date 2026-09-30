import { z } from 'zod'
export const BOARD_COLORS = ['#5b8cff', '#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#60a5fa', '#a78bfa', '#14b8a6', '#f472b6', '#94a3b8'] as const
const color = z.enum(BOARD_COLORS).nullable()
export const boardSettingsSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(), description: z.string().max(5000).nullable().optional(), color: color.optional(), cardColor: color.optional(), defaultListColor: color.optional(),
  enableDueDates: z.boolean().optional(), enableLabels: z.boolean().optional(), enableMembers: z.boolean().optional(), enableChecklists: z.boolean().optional(), enableComments: z.boolean().optional(),
})
export const listSettingsSchema = z.strictObject({ name: z.string().trim().min(1).max(80).optional(), wipLimit: z.number().int().min(1).max(99).nullable().optional(), isDoneList: z.boolean().optional(), color: color.optional() })
export type BoardSettingsInput = z.infer<typeof boardSettingsSchema>
export type BoardSettings = Omit<BoardSettingsInput, 'name' | 'description' | 'color' | 'cardColor' | 'defaultListColor'> & { cardColor?: string | null; defaultListColor?: string | null }
export function completionFor(done: boolean, previous: string | null, now: string) { return done ? previous ?? now : null }
export function cardPresentation<T extends { dueDate: string | null; labelIds: string[]; memberIds: string[]; checklistDone: number; checklistTotal: number; comments: number; coverColor: string | null }>(card: T, settings: BoardSettings = {}): T {
 return { ...card, dueDate: settings.enableDueDates === false ? null : card.dueDate, labelIds: settings.enableLabels === false ? [] : card.labelIds, memberIds: settings.enableMembers === false ? [] : card.memberIds, checklistDone: settings.enableChecklists === false ? 0 : card.checklistDone, checklistTotal: settings.enableChecklists === false ? 0 : card.checklistTotal, comments: settings.enableComments === false ? 0 : card.comments, coverColor: card.coverColor ?? settings.cardColor ?? null }
}
