/**
 * Development auto-auth.
 *
 *   http://localhost:3200/api/dev-auth
 *
 * Signs you in as an existing AXXES account so the app can be worked on without
 * a Handshake round trip. Mirrors members.axxes.club's version.
 *
 * Two things this had to get right, both of which make it fail silently:
 *
 * - The session cookie is issued by Better Auth and is HMAC-signed. Inserting a
 *   session row and setting the bare token produces a cookie the library
 *   discards on read, so /dashboard bounces back to /sign-in with the row
 *   sitting right there in the table. Sign in through the real endpoint
 *   instead and the cookie is the one the library expects.
 * - Those Set-Cookie headers do not survive being appended onto a redirect
 *   response; they have to go through the cookies API.
 */
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { db, schema as s } from "@/lib/db"

const DEV_PASSWORD = "axxes-local-dev"

/** The account to sign in as. Must already exist and hold a membership. */
const DEV_EMAIL = process.env.DEV_AUTH_EMAIL ?? "demo@axxes.club"

function isDevelopmentEnvironment(): boolean {
  // Refuse whenever the host is known to be a real deployment. Treating an
  // unset VERCEL as "this is development" is how a production box ends up
  // serving a route that signs anyone in.
  if (process.env.VERCEL) return false
  if (process.env.VERCEL_ENV === "production") return false
  if (process.env.NODE_ENV === "production") return false
  if (process.env.ALLOW_DEV_AUTH === "true") return true
  return process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"
}

export async function GET(request: NextRequest) {
  if (!isDevelopmentEnvironment()) {
    return NextResponse.json(
      { error: "Dev auth is only available in development" },
      { status: 403 },
    )
  }

  const email = request.nextUrl.searchParams.get("email") ?? DEV_EMAIL

  const user = await db.query.user.findFirst({ where: eq(s.user.email, email) })
  if (!user) {
    return NextResponse.json(
      {
        error: `No user called ${email} in this database.`,
        hint: "DEV_AUTH_EMAIL picks which account to use. It needs an existing user with a tenant membership.",
      },
      { status: 404 },
    )
  }

  // A user with no credential row cannot sign in, so give it one. Re-hashing on
  // every hit keeps this self-healing if DEV_PASSWORD changes.
  const credential = await db.query.account.findFirst({
    where: and(eq(s.account.userId, user.id), eq(s.account.providerId, "credential")),
  })
  if (!credential) {
    await db.insert(s.account).values({
      id: crypto.randomUUID(),
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await hashPassword(DEV_PASSWORD),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Sign in over the real endpoint, so the cookie is the one Better Auth issues.
  const origin = request.nextUrl.origin
  const signIn = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: DEV_PASSWORD }),
  })

  const setCookies = signIn.headers.getSetCookie?.() ?? []
  if (!signIn.ok || setCookies.length === 0) {
    return NextResponse.json(
      { error: "Dev auth could not establish a session", status: signIn.status },
      { status: 500 },
    )
  }

  // Replay those cookies through the cookies API; raw Set-Cookie headers
  // appended to a redirect response are dropped.
  const response = NextResponse.redirect(new URL("/dashboard", request.url))
  for (const raw of setCookies) {
    const [pair, ...attrs] = raw.split(";")
    const split = pair.indexOf("=")
    if (split < 1) continue
    const name = pair.slice(0, split).trim()
    const value = decodeURIComponent(pair.slice(split + 1).trim())
    const has = (k: string) =>
      attrs.some(
        (a) =>
          a.trim().toLowerCase().startsWith(`${k}=`) ||
          a.trim().toLowerCase() === k,
      )
    const attr = (k: string) =>
      attrs
        .map((a) => a.trim())
        .find((a) => a.toLowerCase().startsWith(`${k}=`))
        ?.split("=")[1]

    response.cookies.set(name, value, {
      path: attr("path") ?? "/",
      httpOnly: has("httponly"),
      secure: has("secure"),
      sameSite: (attr("samesite")?.toLowerCase() as "lax" | "strict" | "none") ?? "lax",
      maxAge: attr("max-age") ? Number(attr("max-age")) : undefined,
    })
  }

  return response
}
