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
