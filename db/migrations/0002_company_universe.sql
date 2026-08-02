ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS share_class_detail VARCHAR(32),
  ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(24) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS fundamentals_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS companies_active_fundamentals_idx
  ON companies (is_active, fundamentals_enabled, ticker);

CREATE INDEX IF NOT EXISTS companies_discovery_source_idx
  ON companies (discovery_source);
