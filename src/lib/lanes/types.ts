export type Priority = "low" | "medium" | "high" | "urgent"

export type LabelT = { id: string; name: string; color: string }
export type PersonT = { id: string; name: string; email: string; image: string | null }

export type CardT = {
  id: string
  key: string
  listId: string
  title: string
  description: string | null
  position: number
  priority: Priority
  dueDate: string | null
  completedAt: string | null
  coverColor: string | null
  labelIds: string[]
  memberIds: string[]
  checklistDone: number
  checklistTotal: number
  comments: number
}

export type ListT = { id: string; name: string; position: number; wipLimit: number | null; isDoneList: boolean; color: string | null }

export type BoardT = {
  id: string
  name: string
  description: string | null
  color: string | null
  keyPrefix: string
  lists: ListT[]
  cards: CardT[]
  labels: LabelT[]
  people: PersonT[]
}

/** A card, plus everything the panel shows that is not on the card row. */
export type CardDetailT = CardT & {
  /** Records from the rest of the AXXES suite, re-read live on load. */
  links: import("@/lib/lanes/link-data").CardLinkView[]
  checklists: { id: string; title: string; items: { id: string; text: string; done: boolean }[] }[]
  commentsList: { id: string; content: string; createdAt: string; author: PersonT | null; mine: boolean }[]
  activity: { id: string; type: string; description: string | null; createdAt: string; author: string | null }[]
}

/**
 * One week on a delivery chart.
 *
 * Lives here rather than in `insights.ts` because the chart that draws it is
 * a client component, and `insights.ts` is marked `server-only` — importing a
 * type across that boundary is what turns a type-only import into a build
 * error. The type is data, so it belongs with the other data.
 */
export type ThroughputPoint = {
  /** ISO date of the Monday that starts the week. */
  week: string
  label: string
  created: number
  completed: number
}
