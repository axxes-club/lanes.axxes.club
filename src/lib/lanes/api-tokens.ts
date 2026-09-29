import "server-only"
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import { and, desc, eq, isNull } from "drizzle-orm"
import { db, schema } from "@/lib/db"

/**
 * API tokens.
 *
 * Same shape as the other AXXES products so one mental model covers all of
 * them: `lnk_<id>_<secret>`, secret shown once, stored only as a SHA-256.
 *
 */
const SECRET_BYTES = 32
/** A UUID with its dashes stripped: 32 hex characters. */
const ID_LENGTH = 32
export const TOKEN_PREFIX = "lnk"

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

/**
 * `api_tokens.id` is a uuid column, so the id has to be a uuid.
 *
 * This used to generate 18 hex characters from 9 random bytes, which looked
 * equivalent and was not: every insert failed with `invalid input syntax for
 * type uuid`, so no token had ever been created — the table had zero rows and
 * the whole authenticated API was unreachable. It is a good illustration of
 * why "it type-checks" is not the same as "it works": Drizzle would happily
 * bind a string into a uuid column and let the database say no.
 *
 * The uuid is embedded dashless so the token stays a fixed-shape string, and
 * the dashes are put back when it is read.
 */
function toTokenId(uuid: string): string {
  return uuid.replaceAll("-", "")
}

function fromTokenId(id: string): string | null {
  if (id.length !== ID_LENGTH || !/^[0-9a-f]{32}$/.test(id)) return null
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}

export function newToken() {
  const id = randomUUID()
  const secret = randomBytes(SECRET_BYTES).toString("base64url")
  return { id, secret, token: `${TOKEN_PREFIX}_${toTokenId(id)}_${secret}`, hash: sha256(secret) }
}

/**
 * The id is located by position, not by splitting on "_": base64url emits "_"
 * as a character, so roughly half of all secrets contain one and a split
 * would reject the tokens that happened to be minted with it.
 */
export function tokenIdFrom(token: string): string | null {
  const head = `${TOKEN_PREFIX}_`
  if (!token.startsWith(head)) return null
  const rest = token.slice(head.length)
  if (rest[ID_LENGTH] !== "_") return null
  if (rest.length <= ID_LENGTH + 1) return null
  return fromTokenId(rest.slice(0, ID_LENGTH))
}

export function secretFrom(token: string): string {
  return token.slice(`${TOKEN_PREFIX}_`.length + ID_LENGTH + 1)
}

export function secretMatches(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(sha256(candidate), "hex")
  const b = Buffer.from(storedHash, "hex")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function createToken(input: {
  userId: string
  tenantId: string
  name: string
  scopes: string[]
  expiresInDays?: number | null
}) {
  const { id, token, hash } = newToken()
  const [row] = await db
    .insert(schema.apiTokens)
    .values({
      id,
      userId: input.userId,
      tenantId: input.tenantId,
      name: input.name,
      hash,
      prefix: `${TOKEN_PREFIX}_${id.slice(0, 6)}`,
      scopes: input.scopes,
      isActive: true,
      expiresAt: input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null,
    })
    .returning()
  return { row, token }
}

export async function listTokens(userId: string) {
  return db
    .select({
      id: schema.apiTokens.id,
      name: schema.apiTokens.name,
      prefix: schema.apiTokens.prefix,
      scopes: schema.apiTokens.scopes,
      lastUsedAt: schema.apiTokens.lastUsedAt,
      useCount: schema.apiTokens.useCount,
      expiresAt: schema.apiTokens.expiresAt,
      createdAt: schema.apiTokens.createdAt,
    })
    .from(schema.apiTokens)
    .where(and(eq(schema.apiTokens.userId, userId), isNull(schema.apiTokens.revokedAt)))
    .orderBy(desc(schema.apiTokens.createdAt))
}

/**
 * Resolve a bearer token to what it may do.
 *
 * Unknown, revoked, expired and mis-signed all return null, and the caller
 * must not tell them apart — the difference is free information for someone
 * guessing.
 */
export async function resolveToken(raw: string) {
  const id = tokenIdFrom(raw)
  if (!id) return null

  const [row] = await db.select().from(schema.apiTokens).where(eq(schema.apiTokens.id, id)).limit(1)
  if (!row || !row.hash || row.revokedAt || row.isActive === false) return null
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null
  if (!secretMatches(secretFrom(raw), row.hash)) return null
  return row
}

export function tokenAllows(row: { scopes: string[] | null }, scope: string): boolean {
  const scopes = row.scopes ?? []
  // An empty list means "everything its owner can do", which is what a
  // developer expects from a token they just made.
  return scopes.length === 0 || scopes.includes(scope) || scopes.includes("*")
}

export async function touchToken(id: string, ip?: string) {
  try {
    const { sql } = await import("drizzle-orm")
    await db
      .update(schema.apiTokens)
      .set({
        lastUsedAt: new Date(),
        lastUsedIp: ip ?? null,
        useCount: sql`${schema.apiTokens.useCount} + 1`,
      })
      .where(eq(schema.apiTokens.id, id))
  } catch {
    /* an audit write is not worth failing a request over */
  }
}

export async function revokeToken(userId: string, tokenId: string) {
  await db
    .update(schema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiTokens.id, tokenId), eq(schema.apiTokens.userId, userId)))
}
