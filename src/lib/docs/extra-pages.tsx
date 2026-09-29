import { code, h2, list, note, ordered, p, table } from "./content"
import type { DocBody } from "./content"

/** Sprints. */
export const sprints: DocBody = [
  p(
    <>
      A sprint is a timebox with a goal. The backlog is not a separate table: it is every card on the board that is not
      committed to a sprint, so a card becomes a commitment by being moved into one — a single fact, with nothing to keep in
      sync.
    </>,
  ),
  h2("one-at-a-time", "One active sprint per board"),
  p(
    <>
      Starting a second sprint would make &ldquo;what is in the sprint?&rdquo; have two answers, so starting one closes
      whichever was running. A board has at most one active sprint, always.
    </>,
  ),
  h2("committing", "Committing cards"),
  p(
    <>
      Only a product owner or scrum master may commit a card to a sprint. If a developer could self-commit, the sprint would
      fill with whatever people felt like doing and the commitment would mean nothing.
    </>,
  ),
  note(
    "info",
    "Not public API yet",
    <>
      The sprint logic is live and permissioned, and the board screen exposes it. The HTTP routes are not in the published
      surface yet; they will be added to <a href="/docs/openapi">OpenAPI</a> when they ship rather than documented ahead
      of themselves.
    </>,
  ),
  h2("carry-over", "What happens to unfinished cards"),
  p(
    <>
      Nothing, automatically. When a sprint closes, cards still open are reported rather than moved. Carrying a card over
      is a decision the team makes in the retrospective, and doing it for them quietly is how a sprint grows without anyone
      agreeing to it.
    </>,
  ),
]

/** Migration. */
export const migration: DocBody = [
  p(
    <>
      Most people arrive at Lanes from one of four tools. What follows is what actually changes, rather than a feature
      comparison.
    </>,
  ),

  h2("from-jira", "From Jira"),
  list([
    <>
      <strong>Issue types become labels.</strong> Bug, story and task stop being separate objects with separate
      permissions and become labels on one card. Lanes has one kind of work item on purpose.
    </>,
    <>
      <strong>Components become labels too.</strong> If you want a board per component, that is still fine — a board per
      component, not a field.
    </>,
    <>
      <strong>Sprints are a fact, not a view.</strong> A card is in exactly one place at a time, so it cannot appear in
      the sprint report and the backlog at the same time — which is the bug every board-and-sprint implementation eventually
      grows.
    </>,
    <>
      <strong>Permissions are eight roles, not project roles plus issue-type screens.</strong> The same person can be the
      product owner on one board and a read-only stakeholder on another.
    </>,
  ]),
  h2("from-trello", "From Trello"),
  list([
    <>Lists become lanes, with the same drag and drop, and the lanes can be told which of them counts as done.</>,
    <>Checklists keep working, and a checklist can be suggested from a template so a team stops re-typing &ldquo;definition of done&rdquo;.</>,
    <>Labels, members, due dates and comments are all still there.</>,
    <>
      <strong>What you gain:</strong> card keys, a real permission model, time tracking per card, and an API. Trello&apos;s
      card identity is a position on a board; Lanes&apos; is a key that survives the card moving.
    </>,
  ]),
  h2("from-linear", "From Linear"),
  list([
    <>
      <strong>You keep the command palette.</strong> Linear built a company on ⌘K and Lanes has one too, with the same
      muscle memory.
    </>,
    <>
      <strong>You lose some depth per team.</strong> Lanes has one permission axis. A team that needs a different set of
      people to move different things in different states is better served by Linear, and pretending otherwise would be
      dishonest.
    </>,
  ]),
  h2("from-asana", "From Asana"),
  list([
    <>Sections become lanes. Subtasks are checklists on the card rather than nested cards, because nesting is where a board tool goes to die.</>,
    <>Custom fields are a JSON object on the card, read through a board-level definition.</>,
  ]),

  h2("doing-it", "Actually doing it"),
  ordered([
    <>Create a board from the template that matches how you already talk.</>,
    <>Add a member per person and give them a role on the board, not just workspace access.</>,
    <>Import your open cards. Keys are assigned in order, so they stay unique.</>,
    <>Mark the lane that means &ldquo;done&rdquo; before you import, or nothing will look finished afterwards.</>,
    <>Point your existing automation at the API. It is five endpoints and a token.</>,
  ]),
  note(
    "good",
    "Do the roles before the import",
    <>
      If everybody lands as a viewer, the first thing they try will be a drag that does nothing, and the second thing they
      will do is conclude the tool is broken.
    </>,
  ),
]
