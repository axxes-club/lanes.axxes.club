import {guardPlatformAuth,platformAccessAllowed} from '@/lib/platform-access';
import {APIError} from 'better-auth/api';
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db, schema } from "@/lib/db"

const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")

// Shares the user/session/account tables with members.axxes.club, so every
// AXXES account can sign in here with the same credentials.
// With Handshake (handshake.axxes.club), every *.axxes.club app shares one session cookie
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN
const parentDomain = (cookieDomain || "axxes.club").replace(/^\./, "")

// Central AXXES sign-in; when unset the app uses its own sign-in page
export const HANDSHAKE_URL = process.env.HANDSHAKE_URL?.replace(/\/$/, "") || null

/**
 * Origins trusted in addition to the real domains.
 *
 * `baseURL` is already in the list, so Lanes on its own is fine. This is for
 * the case where sign-in is completed on one port and the session is read on
 * another — a local Handshake on :3101 returning someone to Lanes on :3200.
 * Empty unless EXTRA_TRUSTED_ORIGINS is set, so production is unchanged.
 */
const extraOrigins = (process.env.EXTRA_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const baseAuth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    baseURL,
    `https://${parentDomain}`,
    `https://*.${parentDomain}`,
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...extraOrigins,
  ],
  advanced: cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } : undefined,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  databaseHooks: { session: { create: { before: async (session) => { if(!await platformAccessAllowed(session.userId)) throw new APIError('FORBIDDEN',{message:'Account access is suspended.'}); return {data:session}; } } } },
  // Shared identity enrollment is controlled by Handshake invite creation.
  disabledPaths: ["/sign-up/email"],
  emailAndPassword: { enabled: true },
})

export const auth = guardPlatformAuth(baseAuth);
