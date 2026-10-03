import { code, h2, h3, list, note, p } from "@/lib/docs/content"
import type { DocBlock, DocBody } from "@/lib/docs/content"
import { BOARD_ROLES, ROLE_SUMMARY } from "@/lib/lanes/permissions"
import { BOARD_ROLE_LABEL } from "@/lib/lanes/roles"

/**
 * One heading and one sentence per role, generated from the same two tables
 * the server uses, so this page cannot describe a role that no longer exists
 * or describe it differently from the way it actually behaves.
 */
const roleBlocks: DocBlock[] = BOARD_ROLES.flatMap((role) => [
  { kind: "h3", id: `role-${role}`, text: BOARD_ROLE_LABEL[role] } as DocBlock,
  { kind: "p", text: ROLE_SUMMARY[role] } as DocBlock,
])

export const permissions: DocBody = [
  p(
    <>
      Two roles combine. The <strong>workspace role</strong> — owner, admin, manager, member, viewer — comes from AXXES and
      says what you may do to the workspace. The <strong>board role</strong> is per board and says what you may do to this
      delivery. The more capable of the two wins, so nobody is locked out of a board their organization owns.
    </>,
  ),
  note(
    "good",
    "One table, consulted everywhere",
    <>
      This is the only answer to &ldquo;can this person do this?&rdquo; The board, the card panel, the API and any webhook
      all call it, so two screens cannot give different answers about the same person. It is a table rather than a pile of
      conditionals for exactly that reason.
    </>,
  ),

  h2("roles", "Board roles"),
  ...roleBlocks,

  h2("the-matrix", "The full matrix"),
  p(
    <>
      Generated from the same table the server uses, so this page cannot drift out of date with the code.
    </>,
  ),
  { kind: "matrix", roles: [...BOARD_ROLES] },

  h2("surprises", "Two rules that surprise people"),
  list([
    <>
      <strong>A stakeholder can comment but cannot change a card.</strong> Review is most of what stakeholders are there
      for, and blocking their comments turns them into a mailing list. It is the one role that gets{" "}
      <code>card.comment</code> without <code>card.update</code>.
    </>,
    <>
      <strong>Only a product owner or scrum master can commit a card to a sprint.</strong> If a developer could
      self-commit, the sprint would fill with whatever people felt like doing and the commitment would mean nothing.
    </>,
  ]),

  h2("via-the-api", "Checking a permission before you act"),
  p(
    <>
      A 403 is unambiguous, but a script that checks first is nicer to run. The board endpoint returns the role the token
      resolved to, so you can branch on it.
    </>,
  ),
  code(
    "bash",
    `curl https://lanes.axxes.app/api/v1/boards/$BOARD \\
  -H "Authorization: Bearer $LANES_TOKEN"

# { "data": { "board": { … }, "yourRole": "product_owner" } }`,
  ),
  code(
    "json",
    `{
  "error": {
    "message": "You cannot commit cards to a sprint on this board.",
    "code": "forbidden",
    "hint": "Ask a product owner or scrum master.",
    "requestId": "req_muly4whn000"
  }
}`,
    "What a refused call looks like",
  ),
]
