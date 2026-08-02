import { getDatabase } from "@/lib/db/client";
import type {
  B3InstrumentSnapshot,
  CompanySyncRecord,
  StoredB3Snapshot,
  UniverseWarning,
} from "@/lib/company-universe/types";
import { decideFundamentalWrite } from "@/lib/cvm/persistence-policy";
import type { ComparableFundamentalMetadata } from "@/lib/cvm/selectors/documents";
import type {
  FundamentalCandidate,
  ProcessedSource,
  StoredSourceState,
  TrackedCompany,
  ValidationIssue,
} from "@/lib/cvm/types";
import type { JSONValue, ReservedSql, Sql } from "postgres";

const INGESTION_ADVISORY_LOCK = 751_234_098;

export interface CurrentFundamental extends ComparableFundamentalMetadata {
  ticker: string;
  eps: number;
  bookValuePerShare: number;
  outstandingShares: number | null;
}

export interface CommitInput {
  runId: number;
  sources: readonly ProcessedSource[];
  candidates: readonly FundamentalCandidate[];
  issues: readonly ValidationIssue[];
  companiesProcessed: number;
  documentsChecked: number;
  processingErrors: number;
  status: "success" | "partial" | "unchanged";
  legacyReplacement?: {
    processedTickers: readonly string[];
    currentMethodMarker: string;
  };
  runMetadata?: Record<string, unknown>;
}

export interface CommitSummary {
  inserted: number;
  updated: number;
  ignored: number;
  removed: number;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toJson(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}

function toSourceState(row: Record<string, unknown>): StoredSourceState {
  return {
    sourceKey: String(row.source_key),
    sourceUrl: String(row.source_url),
    sourceLastModified: row.source_last_modified ? String(row.source_last_modified) : null,
    sourceEtag: row.source_etag ? String(row.source_etag) : null,
    sourceSize: row.source_size === null ? null : Number(row.source_size),
    sourceHash: row.source_hash ? String(row.source_hash) : null,
    lastCheckedAt: toIso(row.last_checked_at),
    lastSuccessfulRun: row.last_successful_run
      ? toIso(row.last_successful_run)
      : null,
    status: String(row.status),
    errorMessage: row.error_message ? String(row.error_message) : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as StoredSourceState["metadata"])
        : null,
  };
}

export class PostgresIngestionSession {
  constructor(private readonly sql: ReservedSql) {}

  async startRun(): Promise<number> {
    const [run] = await this.sql<{ id: number }[]>`
      INSERT INTO ingestion_runs (status) VALUES ('running') RETURNING id
    `;
    return Number(run.id);
  }

  async listActiveCompanies(): Promise<TrackedCompany[]> {
    const rows = await this.sql<
      {
        ticker: string;
        cvm_code: string;
        cnpj: string;
        company_name: string;
        share_class: "ON" | "PN";
        is_active: boolean;
      }[]
    >`
      SELECT ticker, cvm_code, cnpj, company_name, share_class, is_active
      FROM companies
      WHERE is_active = TRUE AND fundamentals_enabled = TRUE
      ORDER BY ticker
    `;

    return rows.map((row) => ({
      ticker: row.ticker,
      cvmCode: row.cvm_code,
      cnpj: row.cnpj,
      companyName: row.company_name,
      shareClass: row.share_class,
      isActive: row.is_active,
    }));
  }

  async getStoredB3Snapshot(): Promise<StoredB3Snapshot | null> {
    const [row] = await this.sql<
      { metadata: unknown; last_checked_at: string | Date }[]
    >`
      SELECT metadata, last_checked_at
      FROM ingestion_state
      WHERE source_key = 'B3:INSTRUMENTS'
      LIMIT 1
    `;
    if (!row || !row.metadata || typeof row.metadata !== "object") return null;
    const snapshot = row.metadata as Partial<B3InstrumentSnapshot>;
    if (
      typeof snapshot.sourceDate !== "string" ||
      !Array.isArray(snapshot.tickers) ||
      !snapshot.tickers.every((ticker) => typeof ticker === "string")
    ) {
      return null;
    }
    return {
      snapshot: {
        schemaVersion: snapshot.schemaVersion,
        sourceDate: snapshot.sourceDate,
        tickers: snapshot.tickers,
        listedCompanies: Array.isArray(snapshot.listedCompanies)
          ? snapshot.listedCompanies
          : undefined,
      },
      lastCheckedAt: toIso(row.last_checked_at),
    };
  }

  async applyCompanyUniverse(input: {
    companies: readonly CompanySyncRecord[];
    warnings: readonly UniverseWarning[];
    fcaUrl: string;
    registryUrl: string;
    universeHash: string;
    b3Snapshot: B3InstrumentSnapshot | null;
    b3SnapshotFresh: boolean;
  }): Promise<{ upserted: number; deactivated: number; changed: boolean }> {
    await this.sql`BEGIN`;
    try {
      const transaction = this.sql;
      const [previousState] = await transaction<{ source_hash: string | null }[]>`
        SELECT source_hash
        FROM ingestion_state
        WHERE source_key = 'CVM:FCA_UNIVERSE'
        LIMIT 1
      `;
      const changed = previousState?.source_hash !== input.universeHash;
      const rows = input.companies.map((company) => ({
        ticker: company.ticker,
        cvm_code: company.cvmCode,
        cnpj: company.cnpj,
        company_name: company.companyName,
        share_class: company.shareClass,
        share_class_detail: company.shareClassDetail,
        discovery_source: company.discoverySource,
        fundamentals_enabled: company.fundamentalsEnabled,
        is_active: company.isActive,
      }));

      if (rows.length > 0) {
        await transaction`
          WITH universe AS (
            SELECT * FROM jsonb_to_recordset(
              ${transaction.json(toJson(rows))}::jsonb
            ) AS company (
              ticker TEXT,
              cvm_code TEXT,
              cnpj TEXT,
              company_name TEXT,
              share_class TEXT,
              share_class_detail TEXT,
              discovery_source TEXT,
              fundamentals_enabled BOOLEAN,
              is_active BOOLEAN
            )
          )
          INSERT INTO companies (
            ticker, cvm_code, cnpj, company_name, share_class,
            share_class_detail, discovery_source, fundamentals_enabled,
            is_active, last_seen_at, updated_at
          )
          SELECT
            ticker, cvm_code, cnpj, company_name, share_class,
            share_class_detail, discovery_source, fundamentals_enabled,
            is_active, NOW(), NOW()
          FROM universe
          ON CONFLICT (ticker) DO UPDATE SET
            cvm_code = EXCLUDED.cvm_code,
            cnpj = EXCLUDED.cnpj,
            company_name = EXCLUDED.company_name,
            share_class = EXCLUDED.share_class,
            share_class_detail = EXCLUDED.share_class_detail,
            discovery_source = EXCLUDED.discovery_source,
            fundamentals_enabled = EXCLUDED.fundamentals_enabled,
            is_active = EXCLUDED.is_active,
            last_seen_at = NOW(),
            updated_at = NOW()
        `;
      }

      const automaticTickers = input.companies
        .filter((company) => company.discoverySource !== "manual")
        .map((company) => company.ticker);
      let deactivated = 0;
      if (automaticTickers.length > 0 && input.b3Snapshot) {
        const deactivatedRows = await transaction<{ ticker: string }[]>`
          UPDATE companies
          SET is_active = FALSE, fundamentals_enabled = FALSE, updated_at = NOW()
          WHERE discovery_source IN ('cvm_fca', 'b3_listed')
            AND ticker NOT IN ${transaction(automaticTickers)}
            AND is_active = TRUE
          RETURNING ticker
        `;
        deactivated = deactivatedRows.length;
      }

      await transaction`
        INSERT INTO ingestion_state (
          source_key, source_url, source_hash, last_checked_at,
          last_successful_run, status, error_message, metadata
        ) VALUES (
          'CVM:FCA_UNIVERSE', ${input.fcaUrl}, ${input.universeHash}, NOW(), NOW(),
          'success', NULL,
          ${transaction.json(toJson({
            registryUrl: input.registryUrl,
            companies: input.companies.length,
            warnings: input.warnings.slice(0, 100),
          }))}
        )
        ON CONFLICT (source_key) DO UPDATE SET
          source_url = EXCLUDED.source_url,
          source_hash = EXCLUDED.source_hash,
          last_checked_at = NOW(),
          last_successful_run = NOW(),
          status = 'success',
          error_message = NULL,
          metadata = EXCLUDED.metadata
      `;

      if (input.b3Snapshot && input.b3SnapshotFresh) {
        await transaction`
          INSERT INTO ingestion_state (
            source_key, source_url, last_checked_at, last_successful_run,
            status, error_message, metadata
          ) VALUES (
            'B3:INSTRUMENTS',
            'https://arquivos.b3.com.br/tabelas/InstrumentsConsolidated',
            NOW(), NOW(), 'success', NULL,
            ${transaction.json(toJson(input.b3Snapshot))}
          )
          ON CONFLICT (source_key) DO UPDATE SET
            source_url = EXCLUDED.source_url,
            last_checked_at = NOW(),
            last_successful_run = NOW(),
            status = 'success',
            error_message = NULL,
            metadata = EXCLUDED.metadata
        `;
      }

      await transaction`COMMIT`;
      return { upserted: rows.length, deactivated, changed };
    } catch (error) {
      await this.sql`ROLLBACK`;
      throw error;
    }
  }

  async shouldRetryAfterPartialRun(currentRunId: number): Promise<boolean> {
    const [row] = await this.sql<{ retry: boolean }[]>`
      SELECT COALESCE((
        SELECT status IN ('partial', 'failed')
        FROM ingestion_runs
        WHERE id <> ${currentRunId} AND finished_at IS NOT NULL
        ORDER BY started_at DESC
        LIMIT 1
      ), FALSE) AS retry
    `;
    return row.retry;
  }

  async getSourceState(sourceKey: string): Promise<StoredSourceState | null> {
    const [row] = await this.sql<Record<string, unknown>[]>
      `SELECT * FROM ingestion_state WHERE source_key = ${sourceKey} LIMIT 1`;
    return row ? toSourceState(row) : null;
  }

  async getCurrentFundamental(ticker: string): Promise<CurrentFundamental | null> {
    const [row] = await this.sql<
      {
        ticker: string;
        eps: string | number;
        book_value_per_share: string | number;
        reference_date: string | Date;
        document_type: "ITR" | "DFP";
        document_version: number;
        official_document_id: number;
        document_received_at: string | Date;
        calculation_method: string;
        calculation_details: { outstandingShares?: number };
      }[]
    >`
      SELECT * FROM fundamentals WHERE ticker = ${ticker} LIMIT 1
    `;
    if (!row) return null;
    return {
      ticker: row.ticker,
      eps: Number(row.eps),
      bookValuePerShare: Number(row.book_value_per_share),
      referenceDate: toIso(row.reference_date).slice(0, 10),
      documentType: row.document_type,
      documentVersion: row.document_version,
      officialDocumentId: Number(row.official_document_id),
      documentReceivedAt: toIso(row.document_received_at).slice(0, 10),
      calculationMethod: row.calculation_method,
      outstandingShares: Number.isFinite(row.calculation_details?.outstandingShares)
        ? Number(row.calculation_details.outstandingShares)
        : null,
    };
  }

  async commitSuccessfulRun(input: CommitInput): Promise<CommitSummary> {
    await this.sql`BEGIN`;
    const transaction = this.sql;

    try {
      let inserted = 0;
      let updated = 0;
      let ignored = 0;
      let removed = 0;

      if (input.candidates.length > 0) {
        const currentRows = await transaction<
          {
            ticker: string;
            reference_date: string | Date;
            document_type: "ITR" | "DFP";
            document_version: number;
            official_document_id: number;
            document_received_at: string | Date;
            calculation_method: string;
          }[]
        >`
          SELECT reference_date, document_type, document_version,
                 official_document_id, document_received_at, calculation_method, ticker
          FROM fundamentals
          WHERE ticker IN ${transaction(input.candidates.map((candidate) => candidate.ticker))}
          FOR UPDATE
        `;
        const currentByTicker = new Map<string, ComparableFundamentalMetadata>();
        for (const row of currentRows) {
          currentByTicker.set(row.ticker, {
            referenceDate: toIso(row.reference_date).slice(0, 10),
            documentType: row.document_type,
            documentVersion: row.document_version,
            officialDocumentId: Number(row.official_document_id),
            documentReceivedAt: toIso(row.document_received_at).slice(0, 10),
            calculationMethod: row.calculation_method,
          });
        }

        const candidateRows = input.candidates.map((candidate) => ({
          ticker: candidate.ticker,
          eps: candidate.eps,
          book_value_per_share: candidate.bookValuePerShare,
          reference_date: candidate.referenceDate,
          document_type: candidate.documentType,
          document_version: candidate.documentVersion,
          official_document_id: candidate.officialDocumentId,
          document_received_at: candidate.documentReceivedAt,
          source_cvm_code: candidate.sourceCvmCode,
          calculation_method: candidate.calculationMethod,
          calculation_details: candidate.calculationDetails,
        }));

        await transaction`
          WITH candidates AS (
            SELECT * FROM jsonb_to_recordset(
              ${transaction.json(toJson(candidateRows))}::jsonb
            ) AS candidate (
              ticker TEXT,
              eps NUMERIC,
              book_value_per_share NUMERIC,
              reference_date DATE,
              document_type TEXT,
              document_version INTEGER,
              official_document_id BIGINT,
              document_received_at DATE,
              source_cvm_code TEXT,
              calculation_method TEXT,
              calculation_details JSONB
            )
          )
          INSERT INTO fundamentals_history (
            ticker, eps, book_value_per_share, reference_date, document_type,
            document_version, official_document_id, document_received_at,
            source_cvm_code, calculation_method, calculation_details
          )
          SELECT ticker, eps, book_value_per_share, reference_date, document_type,
                 document_version, official_document_id, document_received_at,
                 source_cvm_code, calculation_method, calculation_details
          FROM candidates
          ON CONFLICT (
            ticker, reference_date, document_type, document_version, calculation_method
          ) DO NOTHING
        `;

        const publishable = input.candidates.filter((candidate) => {
          const current = currentByTicker.get(candidate.ticker) ?? null;
          const decision = decideFundamentalWrite(candidate, current);
          if (decision === "ignore-identical" || decision === "ignore-older") {
            ignored += 1;
            return false;
          }
          if (current) updated += 1;
          else inserted += 1;
          return true;
        });

        if (publishable.length > 0) {
          const publishableRows = candidateRows.filter((row) =>
            publishable.some((candidate) => candidate.ticker === row.ticker),
          );
          await transaction`
            WITH candidates AS (
              SELECT * FROM jsonb_to_recordset(
                ${transaction.json(toJson(publishableRows))}::jsonb
              ) AS candidate (
                ticker TEXT,
                eps NUMERIC,
                book_value_per_share NUMERIC,
                reference_date DATE,
                document_type TEXT,
                document_version INTEGER,
                official_document_id BIGINT,
                document_received_at DATE,
                source_cvm_code TEXT,
                calculation_method TEXT,
                calculation_details JSONB
              )
            )
            INSERT INTO fundamentals (
              ticker, eps, book_value_per_share, reference_date, document_type,
              document_version, official_document_id, document_received_at,
              source_cvm_code, calculation_method, calculation_details, updated_at
            )
            SELECT ticker, eps, book_value_per_share, reference_date, document_type,
                   document_version, official_document_id, document_received_at,
                   source_cvm_code, calculation_method, calculation_details, NOW()
            FROM candidates
            ON CONFLICT (ticker) DO UPDATE SET
              eps = EXCLUDED.eps,
              book_value_per_share = EXCLUDED.book_value_per_share,
              reference_date = EXCLUDED.reference_date,
              document_type = EXCLUDED.document_type,
              document_version = EXCLUDED.document_version,
              official_document_id = EXCLUDED.official_document_id,
              document_received_at = EXCLUDED.document_received_at,
              source_cvm_code = EXCLUDED.source_cvm_code,
              calculation_method = EXCLUDED.calculation_method,
              calculation_details = EXCLUDED.calculation_details,
              updated_at = NOW()
          `;
        }
      }

      if (
        input.legacyReplacement &&
        input.legacyReplacement.processedTickers.length > 0
      ) {
        const removedRows = await transaction<{ ticker: string }[]>`
          DELETE FROM fundamentals
          WHERE ticker IN ${transaction([...input.legacyReplacement.processedTickers])}
            AND calculation_method NOT LIKE ${`%${input.legacyReplacement.currentMethodMarker}`}
          RETURNING ticker
        `;
        removed = removedRows.length;
      }

      for (const source of input.sources) {
        await transaction`
          INSERT INTO ingestion_state (
            source_key, source_url, source_last_modified, source_etag,
            source_size, source_hash, last_checked_at, last_successful_run,
            status, error_message, metadata
          ) VALUES (
            ${source.source.key}, ${source.source.url}, ${source.lastModified},
            ${source.etag}, ${source.size}, ${source.hash}, NOW(),
            CASE WHEN ${source.processingStatus} = 'success' THEN NOW() ELSE NULL END,
            ${source.processingStatus}, ${source.errorMessage},
            ${transaction.json(toJson(source.snapshot))}
          )
          ON CONFLICT (source_key) DO UPDATE SET
            source_url = EXCLUDED.source_url,
            source_last_modified = EXCLUDED.source_last_modified,
            source_etag = EXCLUDED.source_etag,
            source_size = EXCLUDED.source_size,
            source_hash = EXCLUDED.source_hash,
            last_checked_at = NOW(),
            last_successful_run = CASE
              WHEN EXCLUDED.status = 'success' THEN NOW()
              ELSE ingestion_state.last_successful_run
            END,
            status = EXCLUDED.status,
            error_message = EXCLUDED.error_message,
            metadata = EXCLUDED.metadata
        `;
      }

      const warningsCount = input.issues.filter((issue) => issue.level === "warning").length;
      const validationErrors = input.issues.filter((issue) => issue.level === "error").length;
      await transaction`
        UPDATE ingestion_runs SET
          finished_at = NOW(),
          status = ${input.status},
          documents_checked = ${input.documentsChecked},
          documents_downloaded = ${input.sources.filter((source) => source.downloaded).length},
          companies_processed = ${input.companiesProcessed},
          fundamentals_inserted = ${inserted},
          fundamentals_updated = ${updated},
          warnings_count = ${warningsCount},
          errors_count = ${validationErrors + input.processingErrors},
          metadata = ${transaction.json(toJson({
            ignored,
            removed,
            ...(input.runMetadata ?? {}),
          }))}
        WHERE id = ${input.runId}
      `;

      await transaction`COMMIT`;
      return { inserted, updated, ignored, removed };
    } catch (error) {
      await transaction`ROLLBACK`;
      throw error;
    }
  }

  async failRun(runId: number, message: string): Promise<void> {
    await this.sql`
      UPDATE ingestion_runs SET
        finished_at = NOW(), status = 'failed', errors_count = errors_count + 1,
        error_message = ${message.slice(0, 1000)}
      WHERE id = ${runId}
    `;
  }
}

export interface LockResult<T> {
  acquired: boolean;
  value?: T;
}

export async function withIngestionLock<T>(
  task: (session: PostgresIngestionSession) => Promise<T>,
  sql: Sql = getDatabase(),
): Promise<LockResult<T>> {
  const reserved = await sql.reserve();

  try {
    const [lock] = await reserved<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(${INGESTION_ADVISORY_LOCK}) AS acquired
    `;
    if (!lock.acquired) return { acquired: false };

    try {
      return { acquired: true, value: await task(new PostgresIngestionSession(reserved)) };
    } finally {
      await reserved`SELECT pg_advisory_unlock(${INGESTION_ADVISORY_LOCK})`;
    }
  } finally {
    reserved.release();
  }
}
