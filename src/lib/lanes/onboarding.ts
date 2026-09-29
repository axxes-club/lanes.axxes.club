import "server-only"
import { randomBytes } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { badRequest } from "./errors"

/**
 * Getting a new account into a workspace.
 *
 * The only interesting decision is whether the person is already a member of
 * one. If they are — because a colleague invited them before they signed up,
 * or because they were added from the members portal — onboarding should get
 * out of the way immediately rather than asking them to create a second
 * workspace they do not need.
 */

export type Membership = { tenantId: string; name: string; slug: string; role: string }

export async function membershipsFor(userId: string): Promise<Membership[]> {
  const rows = await db
    .select({
      tenantId: s.tenantMemberships.tenantId,
      name: s.tenants.name,
      slug: s.tenants.slug,
      role: s.tenantMemberships.role,
    })
    .from(s.tenantMemberships)
    .innerJoin(s.tenants, eq(s.tenants.id, s.tenantMemberships.tenantId))
    .where(and(eq(s.tenantMemberships.userId, userId), isNull(s.tenantMemberships.deletedAt), isNull(s.tenants.deletedAt)))
  return rows
}

const WORKSPACE_KINDS = [
  { value: "business", label: "Company", blurb: "A product or engineering team" },
  { value: "agency", label: "Agency", blurb: "Client work, several at once" },
  { value: "venue", label: "Venue", blurb: "Events, rooms and ticketing" },
  { value: "brand", label: "Brand", blurb: "A label, store or collection" },
]

export const WORKSPACE_KINDS_EXPORTED = WORKSPACE_KINDS

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
  return base || "workspace"
}

/**
 * Create a workspace and make its creator the owner.
 *
 * The slug gets a short random suffix because the column is globally unique
 * across the whole suite, not per organization: "Acme" is very likely already
 * taken by a different company, and a collision here would surface as a
 * constraint violation rather than a friendly message.
 */
export async function createWorkspace(input: {
  name: string
  kind: string
  userId: string
}): Promise<{ tenantId: string }> {
  const name = input.name.trim().slice(0, 80)
  if (!name) throw badRequest("Give the workspace a name.")
  if (!WORKSPACE_KINDS.some((k) => k.value === input.kind)) {
    throw badRequest("Pick what kind of workspace this is.")
  }

  const slug = `${slugify(name)}-${randomBytes(3).toString("hex")}`

  const [tenant] = await db
    .insert(s.tenants)
    .values({
      name,
      slug,
      type: input.kind,
      status: "active",
      ownerId: input.userId,
      email: null,
    })
    .returning()

  // The creator is the owner, not a manager: a workspace whose owner is
  // someone else cannot be deleted by the person who made it.
  await db.insert(s.tenantMemberships).values({
    tenantId: tenant.id,
    userId: input.userId,
    role: "owner",
    isPrimary: true,
  })

  // Give them something to look at. An empty workspace is indistinguishable
  // from a broken one, and the fastest way to know what a tool is for is to
  // see a board in it.
  const { projectCards, projectLists, projectLabels, projects } = s
  const [board] = await db
    .insert(projects)
    .values({
      tenantId: tenant.id,
      name: "Getting started",
      slug: `getting-started-${randomBytes(2).toString("hex")}`,
      description: "A sample board. Rename it, or delete it and make your own.",
      color: "#5b8cff",
      createdById: input.userId,
      settings: { keyPrefix: "GS" },
    })
    .returning()

  await db.insert(projectLists).values([
    { projectId: board.id, name: "To do", position: 0 },
    { projectId: board.id, name: "In progress", position: 1, wipLimit: 5 },
    { projectId: board.id, name: "Done", position: 2, isDoneList: true },
  ])
  await db.insert(projectLabels).values([
    { projectId: board.id, name: "Bug", color: "#ef4444" },
    { projectId: board.id, name: "Feature", color: "#3b82f6" },
    { projectId: board.id, name: "Blocked", color: "#f59e0b" },
  ])
  const [lane] = await db
    .select({ id: projectLists.id })
    .from(projectLists)
    .where(eq(projectLists.projectId, board.id))
    .orderBy(projectLists.position)
    .limit(1)
  await db.insert(projectCards).values([
    {
      projectId: board.id,
      listId: lane.id,
      title: "Open the command palette with ⌘K",
      description: "It reaches every board, card and person, and every other AXXES app. It works from anywhere, including inside a text field.",
      position: 0,
      createdById: input.userId,
      customFields: { seq: 1 },
    },
    {
      projectId: board.id,
      listId: lane.id,
      title: "Open a card and try the right-click menu",
      description: "Right-click anything on a board: a card, a lane, or the background. It is the fastest way to see what a board can do.",
      position: 1,
      createdById: input.userId,
      customFields: { seq: 2 },
    },
    {
      projectId: board.id,
      listId: lane.id,
      title: "Invite a colleague and give them a role",
      description: "Board → People. Roles are per board, so somebody can own one board and only read another.",
      position: 2,
      createdById: input.userId,
      customFields: { seq: 3 },
    },
  ])

  return { tenantId: tenant.id }
}

/**
 * Join with an invite code.
 *
 * The code is validated but a workspace is never created from one: joining
 * somebody else's workspace has to be a deliberate act by somebody who
 * already has a role, or invite codes become a way to walk into a company.
 */
export async function joinWithCode(input: { code: string; userId: string }): Promise<{ tenantId: string } | null> {
  const code = input.code.trim().toUpperCase()
  if (!code) throw badRequest("Enter the invite code you were sent.")

  const [invite] = await db
    .select()
    .from(s.inviteCodes)
    .where(eq(s.inviteCodes.code, code))
    .limit(1)
    .catch(() => [])

  if (!invite || !invite.isActive) return null
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return null
  if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) return null

  return null
}

/** Re-exported so the action layer does not need its own context helper. */
export { requireContext }
