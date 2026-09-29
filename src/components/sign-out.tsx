"use client"

// /sign-out ends the session here, or for every AXXES app via Handshake when it's on
export function SignOut() {
  return (
    <a
      className="btn-ghost btn-icon-sm"
      href="/sign-out"
      title="Sign out"
      aria-label="Sign out"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
    </a>
  )
}
