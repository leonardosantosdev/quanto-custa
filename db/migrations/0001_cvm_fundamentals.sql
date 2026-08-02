CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(12) NOT NULL UNIQUE,
  cvm_code VARCHAR(12) NOT NULL,
  cnpj VARCHAR(18) NOT NULL,
  company_name VARCHAR(180) NOT NULL,
  share_class VARCHAR(8) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT companies_ticker_uppercase CHECK (ticker = UPPER(ticker)),
  CONSTRAINT companies_share_class_supported CHECK (share_class IN ('ON', 'PN'))
);

CREATE INDEX IF NOT EXISTS companies_cvm_code_idx ON companies (cvm_code);
CREATE INDEX IF NOT EXISTS companies_cnpj_idx ON companies (cnpj);

CREATE TABLE IF NOT EXISTS fundamentals (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(12) NOT NULL UNIQUE REFERENCES companies(ticker),
  eps NUMERIC(28, 10) NOT NULL,
  book_value_per_share NUMERIC(28, 10) NOT NULL,
  reference_date DATE NOT NULL,
  document_type VARCHAR(3) NOT NULL,
  document_version INTEGER NOT NULL,
  official_document_id BIGINT NOT NULL,
  document_received_at DATE NOT NULL,
  source_cvm_code VARCHAR(12) NOT NULL,
  calculation_method VARCHAR(160) NOT NULL,
  calculation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fundamentals_document_type CHECK (document_type IN ('ITR', 'DFP'))
);

CREATE TABLE IF NOT EXISTS fundamentals_history (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(12) NOT NULL REFERENCES companies(ticker),
  eps NUMERIC(28, 10) NOT NULL,
  book_value_per_share NUMERIC(28, 10) NOT NULL,
  reference_date DATE NOT NULL,
  document_type VARCHAR(3) NOT NULL,
  document_version INTEGER NOT NULL,
  official_document_id BIGINT NOT NULL,
  document_received_at DATE NOT NULL,
  source_cvm_code VARCHAR(12) NOT NULL,
  calculation_method VARCHAR(160) NOT NULL,
  calculation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fundamentals_history_document_type CHECK (document_type IN ('ITR', 'DFP')),
  CONSTRAINT fundamentals_history_logical_version UNIQUE (
    ticker,
    reference_date,
    document_type,
    document_version,
    calculation_method
  )
);

CREATE INDEX IF NOT EXISTS fundamentals_history_ticker_idx
  ON fundamentals_history (ticker, reference_date DESC, document_version DESC);
CREATE INDEX IF NOT EXISTS fundamentals_history_document_id_idx
  ON fundamentals_history (official_document_id);

CREATE TABLE IF NOT EXISTS ingestion_state (
  source_key VARCHAR(80) PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_last_modified TEXT,
  source_etag TEXT,
  source_size BIGINT,
  source_hash VARCHAR(64),
  last_checked_at TIMESTAMPTZ NOT NULL,
  last_successful_run TIMESTAMPTZ,
  status VARCHAR(24) NOT NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(24) NOT NULL,
  documents_checked INTEGER NOT NULL DEFAULT 0,
  documents_downloaded INTEGER NOT NULL DEFAULT 0,
  companies_processed INTEGER NOT NULL DEFAULT 0,
  fundamentals_inserted INTEGER NOT NULL DEFAULT 0,
  fundamentals_updated INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ingestion_runs_started_at_idx
  ON ingestion_runs (started_at DESC);
