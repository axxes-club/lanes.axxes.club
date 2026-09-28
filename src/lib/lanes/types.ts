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

export type CardDetailT = CardT & {
  checklists: { id: string; title: string; items: { id: string; text: string; done: boolean }[] }[]
  commentsList: { id: string; content: string; createdAt: string; author: PersonT | null; mine: boolean }[]
  activity: { id: string; type: string; description: string | null; createdAt: string; author: string | null }[]
}
