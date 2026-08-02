CREATE TABLE IF NOT EXISTS cash_proceeds (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(12) NOT NULL REFERENCES companies(ticker),
  event_key VARCHAR(64) NOT NULL,
  isin_code VARCHAR(16) NOT NULL,
  proceeds_type VARCHAR(16) NOT NULL,
  source_label VARCHAR(80) NOT NULL,
  gross_value_per_share NUMERIC(28, 12) NOT NULL,
  net_value_per_share NUMERIC(28, 12) NOT NULL,
  original_value_per_share NUMERIC(28, 12) NOT NULL,
  adjustment_factor NUMERIC(28, 12) NOT NULL DEFAULT 1,
  approval_date DATE NOT NULL,
  ex_date DATE NOT NULL,
  payment_date DATE,
  related_to VARCHAR(120),
  remarks TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_proceeds_type CHECK (proceeds_type IN ('dividend', 'jcp')),
  CONSTRAINT cash_proceeds_values_positive CHECK (
    gross_value_per_share > 0 AND
    net_value_per_share > 0 AND
    original_value_per_share > 0 AND
    adjustment_factor > 0
  ),
  CONSTRAINT cash_proceeds_ticker_event_unique UNIQUE (ticker, event_key)
);

CREATE INDEX IF NOT EXISTS cash_proceeds_ticker_period_idx
  ON cash_proceeds (ticker, is_active, ex_date DESC);

CREATE INDEX IF NOT EXISTS cash_proceeds_isin_idx
  ON cash_proceeds (isin_code, ex_date DESC);

CREATE TABLE IF NOT EXISTS dividend_sync_state (
  issuing_company VARCHAR(8) PRIMARY KEY,
  last_checked_at TIMESTAMPTZ NOT NULL,
  last_successful_at TIMESTAMPTZ,
  status VARCHAR(24) NOT NULL,
  source_hash VARCHAR(64),
  events_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS dividend_sync_state_schedule_idx
  ON dividend_sync_state (last_successful_at NULLS FIRST, issuing_company);
