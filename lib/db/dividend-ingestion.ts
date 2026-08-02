import { getDatabase } from "@/lib/db/client";
import type {
  CashProceedsCandidate,
  DividendSyncTarget,
  ParsedDividendSnapshot,
} from "@/lib/b3-dividends/types";
import type { JSONValue, Sql } from "postgres";

const DIVIDEND_ADVISORY_LOCK = 751_234_099;

function toJson(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}

export async function listDividendSyncTargets(
  limit: number,
  sql: Sql = getDatabase(),
): Promise<DividendSyncTarget[]> {
  const rows = await sql<
    {
      issuing_company: string;
      companies: Array<{ ticker: string; shareClassDetail: string }>;
    }[]
  >`
    SELECT
      LEFT(c.ticker, 4) AS issuing_company,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'ticker', c.ticker,
          'shareClassDetail', c.share_class_detail
        ) ORDER BY c.ticker
      ) AS companies
    FROM companies c
    LEFT JOIN dividend_sync_state d
      ON d.issuing_company = LEFT(c.ticker, 4)
    WHERE c.is_active = TRUE
      AND c.ticker ~ '^[A-Z]{4}[3-8]$'
    GROUP BY LEFT(c.ticker, 4), d.last_successful_at, d.last_checked_at
    ORDER BY COALESCE(d.last_successful_at, d.last_checked_at) ASC NULLS FIRST,
      LEFT(c.ticker, 4)
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    issuingCompany: row.issuing_company,
    companies: row.companies,
  }));
}

export async function saveDividendSnapshot(options: {
  target: DividendSyncTarget;
  snapshot: ParsedDividendSnapshot;
  warnings: readonly string[];
  sql?: Sql;
}): Promise<number> {
  const sql = options.sql ?? getDatabase();
  const tickers = options.target.companies.map((company) => company.ticker);
  const rows = options.snapshot.candidates.map((candidate) => ({
    ticker: candidate.ticker,
    event_key: candidate.eventKey,
    isin_code: candidate.isinCode,
    proceeds_type: candidate.proceedsType,
    source_label: candidate.sourceLabel,
    gross_value_per_share: candidate.grossValuePerShare,
    net_value_per_share: candidate.netValuePerShare,
    original_value_per_share: candidate.originalValuePerShare,
    adjustment_factor: candidate.adjustmentFactor,
    approval_date: candidate.approvalDate,
    ex_date: candidate.exDate,
    payment_date: candidate.paymentDate,
    related_to: candidate.relatedTo,
    remarks: candidate.remarks,
  }));

  await sql.begin(async (transaction) => {
    if (tickers.length > 0) {
      await transaction`
        UPDATE cash_proceeds
        SET is_active = FALSE, updated_at = NOW()
        WHERE ticker IN ${transaction(tickers)} AND is_active = TRUE
      `;
    }

    if (rows.length > 0) {
      await transaction`
        WITH events AS (
          SELECT * FROM jsonb_to_recordset(
            ${transaction.json(toJson(rows))}::jsonb
          ) AS event (
            ticker TEXT,
            event_key TEXT,
            isin_code TEXT,
            proceeds_type TEXT,
            source_label TEXT,
            gross_value_per_share NUMERIC,
            net_value_per_share NUMERIC,
            original_value_per_share NUMERIC,
            adjustment_factor NUMERIC,
            approval_date DATE,
            ex_date DATE,
            payment_date DATE,
            related_to TEXT,
            remarks TEXT
          )
        )
        INSERT INTO cash_proceeds (
          ticker, event_key, isin_code, proceeds_type, source_label,
          gross_value_per_share, net_value_per_share,
          original_value_per_share, adjustment_factor, approval_date,
          ex_date, payment_date, related_to, remarks, is_active,
          first_seen_at, last_seen_at, updated_at
        )
        SELECT
          ticker, event_key, isin_code, proceeds_type, source_label,
          gross_value_per_share, net_value_per_share,
          original_value_per_share, adjustment_factor, approval_date,
          ex_date, payment_date, related_to, remarks, TRUE,
          NOW(), NOW(), NOW()
        FROM events
        ON CONFLICT (ticker, event_key) DO UPDATE SET
          isin_code = EXCLUDED.isin_code,
          proceeds_type = EXCLUDED.proceeds_type,
          source_label = EXCLUDED.source_label,
          gross_value_per_share = EXCLUDED.gross_value_per_share,
          net_value_per_share = EXCLUDED.net_value_per_share,
          original_value_per_share = EXCLUDED.original_value_per_share,
          adjustment_factor = EXCLUDED.adjustment_factor,
          approval_date = EXCLUDED.approval_date,
          ex_date = EXCLUDED.ex_date,
          payment_date = EXCLUDED.payment_date,
          related_to = EXCLUDED.related_to,
          remarks = EXCLUDED.remarks,
          is_active = TRUE,
          last_seen_at = NOW(),
          updated_at = NOW()
      `;
    }

    await transaction`
      INSERT INTO dividend_sync_state (
        issuing_company, last_checked_at, last_successful_at, status,
        source_hash, events_count, error_message, metadata
      ) VALUES (
        ${options.target.issuingCompany}, NOW(), NOW(), 'success',
        ${options.snapshot.sourceHash}, ${rows.length}, NULL,
        ${transaction.json(toJson({
          tickers,
          warnings: options.warnings.slice(0, 50),
        }))}
      )
      ON CONFLICT (issuing_company) DO UPDATE SET
        last_checked_at = NOW(),
        last_successful_at = NOW(),
        status = 'success',
        source_hash = EXCLUDED.source_hash,
        events_count = EXCLUDED.events_count,
        error_message = NULL,
        metadata = EXCLUDED.metadata
    `;
  });

  return rows.length;
}

export async function saveDividendSyncFailure(
  issuingCompany: string,
  error: unknown,
  sql: Sql = getDatabase(),
): Promise<void> {
  const message = error instanceof Error ? error.message : "Falha desconhecida";
  await sql`
    INSERT INTO dividend_sync_state (
      issuing_company, last_checked_at, status, error_message
    ) VALUES (${issuingCompany}, NOW(), 'failed', ${message.slice(0, 1000)})
    ON CONFLICT (issuing_company) DO UPDATE SET
      last_checked_at = NOW(),
      status = 'failed',
      error_message = EXCLUDED.error_message
  `;
}

export interface DividendLockResult<T> {
  acquired: boolean;
  value?: T;
}

export async function withDividendSyncLock<T>(
  task: () => Promise<T>,
  sql: Sql = getDatabase(),
): Promise<DividendLockResult<T>> {
  const reserved = await sql.reserve();
  try {
    const [lock] = await reserved<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(${DIVIDEND_ADVISORY_LOCK}) AS acquired
    `;
    if (!lock.acquired) return { acquired: false };
    try {
      return { acquired: true, value: await task() };
    } finally {
      await reserved`SELECT pg_advisory_unlock(${DIVIDEND_ADVISORY_LOCK})`;
    }
  } finally {
    reserved.release();
  }
}

export type { CashProceedsCandidate };
