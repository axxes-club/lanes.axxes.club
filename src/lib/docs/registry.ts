import { introduction } from "./pages/introduction"
import { quickstart } from "./pages/quickstart"
import { authentication } from "./pages/authentication"
import { boards } from "./pages/boards"
import { cards } from "./pages/cards"
import { search } from "./pages/search"
import { permissions } from "./pages/permissions"
import { errors } from "./pages/errors"
import { rateLimits } from "./pages/rate-limits"
import { webhooks } from "./pages/webhooks"
import { sprints, migration } from "./extra-pages"
import type { DocBody } from "./content"

/**
 * Every documentation page, in one table.
 *
 * Imported eagerly and eagerly registered. There are ten pages; a dynamic
 * import map would buy nothing and would make a typo surface as a missing
 * page rather than a build failure.
 */
export const DOC_PAGES: Record<string, DocBody> = {
  "": introduction,
  quickstart,
  authentication,
  boards,
  cards,
  search,
  permissions,
  errors,
  "rate-limits": rateLimits,
  webhooks,
  sprints,
  migration,
}
