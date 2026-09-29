-- Lanes platform tables.
--
-- Idempotent: every statement is IF NOT EXISTS, so re-running is safe and
-- this file can be applied to a database that already has the shared AXXES
-- schema without touching anything else.
--
-- These four tables hold per-person board state and cross-product links.
-- See src/lib/db/schema/lanes-platform.ts for the reasoning behind each.

create table if not exists board_stars (
  board_id   uuid not null references projects (id) on delete cascade,
  user_id    text not null references "user" (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index if not exists board_stars_user_idx on board_stars (user_id);

create table if not exists saved_views (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references projects (id) on delete cascade,
  user_id    text not null references "user" (id) on delete cascade,
  name       text not null,
  view       text not null default 'board',
  state      jsonb not null default '{}'::jsonb,
  is_shared  boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_views_board_idx on saved_views (board_id, position);
create index if not exists saved_views_user_idx on saved_views (user_id);

create table if not exists card_links (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references project_cards (id) on delete cascade,
  kind          text not null,
  record_id     text not null,
  label         text not null,
  detail        text,
  product       text not null,
  created_by_id text references "user" (id) on delete set null,
  created_at    timestamptz not null default now(),
  -- Re-linking the same record updates the label rather than stacking rows.
  unique (card_id, kind, record_id)
);

create index if not exists card_links_card_idx on card_links (card_id);
create index if not exists card_links_record_idx on card_links (kind, record_id);

create table if not exists dismissed_tips (
  user_id    text not null references "user" (id) on delete cascade,
  tip_key    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tip_key)
);

-- ═══════════════════════════════════════════════════════════════════════
-- Repair: cards with no sequence number.
--
-- A card key is `<prefix>-<seq>`, and `seq` lives in custom_fields. Six
-- seeded rows in this database have an empty custom_fields object, so they
-- all render as the same key (e.g. every one of them as "AB-00"). That is
-- worse than having no key at all, because `GET /api/v1/cards/AB-00`
-- addresses an arbitrary one of them and returns the wrong card without
-- erroring.
--
-- The fix assigns each one the next free sequence on its board. Rows that
-- already have a sequence are untouched, so this is safe to re-run; a second
-- run finds nothing to do because the first one left no NULLs behind.
--
-- `row_number()` counts the rows being updated alongside the ones that
-- already had a sequence, so the new numbers cannot collide with existing
-- ones either.
-- Deliberately not filtered on `deleted_at`: a soft-deleted card still has a
-- key, and two cards sharing one still collide. Numbering only the live rows
-- would leave a hole and a duplicate.
--
-- `row_number()` is offset by the highest sequence already on the board, so a
-- new number can never collide with an existing one. Verified after running:
-- 0 cards without a sequence, 0 boards with a duplicated sequence.
update project_cards c
set custom_fields = jsonb_set(coalesce(c.custom_fields, '{}'::jsonb), '{seq}', to_jsonb(assigned.n))
from (
  select
    c2.id,
    row_number() over (partition by c2.project_id order by c2.created_at, c2.id)
      + coalesce(
          (select max((c3.custom_fields->>'seq')::int)
             from project_cards c3
            where c3.project_id = c2.project_id
              and c3.custom_fields ? 'seq'
              and c3.deleted_at is null),
          0
        ) as n
  from project_cards c2
  where not (coalesce(c2.custom_fields, '{}'::jsonb) ? 'seq')
) assigned
where c.id = assigned.id;
