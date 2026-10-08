-- Additive migration: anonymous first-party page views only.
-- Does not modify existing tables, accounts, orders, or public schema.
CREATE TABLE IF NOT EXISTS qwenimage2.page_view (
  id text PRIMARY KEY,
  visitor_hash text NOT NULL,
  path text NOT NULL,
  day text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_view_day_path_idx ON qwenimage2.page_view (day, path);
CREATE INDEX IF NOT EXISTS page_view_created_idx ON qwenimage2.page_view (created_at);
