/**
 * One error type so the UI can say something useful instead of "500".
 * `hint` is what a person can actually do about it.
 */
export class LanesError extends Error {
  readonly status: number
  readonly hint: string | null
  constructor(message: string, status = 400, hint: string | null = null) {
    super(message)
    this.name = "LanesError"
    this.status = status
    this.hint = hint
  }
}

export const forbidden = (message: string, hint: string | null = null) =>
  new LanesError(message, 403, hint)
export const notFound = (what = "That") => new LanesError(`${what} could not be found.`, 404)
export const badRequest = (message: string, hint: string | null = null) =>
  new LanesError(message, 400, hint)
