"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LanesError } from "./errors"
import { ORG_COOKIE } from "@/lib/context"
import { createWorkspace, joinWithCode } from "./onboarding"

/**
 * Onboarding actions.
 *
 * Both paths re-check the session inside the action rather than trusting the
 * page that rendered the form. A server action is a public endpoint — anyone
 * can POST to it with a crafted body — so "the page that linked here already
 * checked" is not a security property.
 */
export type ActionResult = { error?: string }

export async function createWorkspaceAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { error: "Your session expired. Sign in and try again." }

  try {
    const { tenantId } = await createWorkspace({
      name: String(form.get("name") ?? ""),
      kind: String(form.get("kind") ?? "business"),
      userId: session.user.id,
    })
    await selectOrganization(tenantId)
  } catch (e) {
    if (e instanceof LanesError) return { error: e.message }
    console.error(e)
    return { error: "Could not create the workspace. Try again." }
  }
  redirect("/dashboard")
}

export async function joinWithCodeAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { error: "Your session expired. Sign in and try again." }

  const result = await joinWithCode({ code: String(form.get("code") ?? ""), userId: session.user.id })
  if (!result) {
    return { error: "That code is not valid, has expired, or has already been used. Ask whoever invited you for a new one." }
  }
  await selectOrganization(result.tenantId)
  redirect("/dashboard")
}

/**
 * Point this browser at a workspace.
 *
 * Same shape as the switcher: the cookie is a preference, never a permission,
 * and every page re-derives what the person may actually see.
 */
async function selectOrganization(tenantId: string) {
  const secure = (await headers()).get("x-forwarded-proto") === "https"
  ;(await cookies()).set(ORG_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}
