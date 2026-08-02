import { loadCvmSource } from "@/lib/cvm/client";
import { calculateCompanyFundamentals } from "@/lib/cvm/calculations/fundamentals";
import { runCompanyUniverseSyncWithSession } from "@/lib/company-universe/sync";
import type { CompanyUniverseSyncSummary } from "@/lib/company-universe/types";
import { logIngestion } from "@/lib/cvm/logger";
import { getCvmSources } from "@/lib/cvm/sources";
import type {
  FundamentalCandidate,
  ProcessedSource,
  ValidationIssue,
} from "@/lib/cvm/types";
import {
  createVariationWarnings,
  validateFundamentalCandidate,
} from "@/lib/cvm/validation";
import { FUNDAMENTALS_PIPELINE_REVISION } from "@/lib/cvm/version";
import {
  PostgresIngestionSession,
  withIngestionLock,
} from "@/lib/db/ingestion-repository";

export interface IngestionSummary {
  status: "success" | "partial" | "unchanged" | "already-running";
  runId: number | null;
  documentsChecked: number;
  documentsDownloaded: number;
  companiesProcessed: number;
  fundamentalsInserted: number;
  fundamentalsUpdated: number;
  fundamentalsIgnored: number;
  fundamentalsRemoved: number;
  warnings: number;
  errors: number;
  companiesDiscovered?: number;
  companiesUpserted?: number;
  companiesDeactivated?: number;
  automaticCompanies?: number;
  b3SourceDate?: string | null;
}

type SourceLoader = typeof loadCvmSource;

async function runLockedPipeline(
  session: PostgresIngestionSession,
  sourceLoader: SourceLoader,
  now: Date,
): Promise<IngestionSummary> {
  const runId = await session.startRun();
  const retryPreviousPartialRun = await session.shouldRetryAfterPartialRun(runId);
  logIngestion("info", "ingestion.started", { runId });

  try {
    const issues: ValidationIssue[] = [];
    let companySync: CompanyUniverseSyncSummary | null = null;
    let companySyncErrors = 0;
    try {
      companySync = await runCompanyUniverseSyncWithSession(session, { now });
      issues.push(...companySync.warnings.map((warning) => ({
        level: "warning" as const,
        code: warning.code,
        message: warning.message,
      })));
      if (companySync.status === "partial") companySyncErrors += 1;
    } catch (error) {
      companySyncErrors += 1;
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      issues.push({
        level: "warning",
        code: "COMPANY_UNIVERSE_SYNC_FAILED",
        message: `O cadastro de companhias não pôde ser atualizado: ${message}`,
      });
      logIngestion("error", "company_universe.failed", { runId, message });
    }

    const companies = await session.listActiveCompanies();
    const sources = getCvmSources(now);
    const processedSources: ProcessedSource[] = [];
    let sourceErrors = 0;
    let calculationErrors = 0;

    for (const source of sources) {
      const state = await session.getSourceState(source.key);
      logIngestion("info", "source.checked", { runId, sourceKey: source.key });

      try {
        const processed = await sourceLoader(source, state, companies);
        processedSources.push(processed);
        logIngestion("info", processed.changed ? "source.changed" : "source.unchanged", {
          runId,
          sourceKey: source.key,
          downloaded: processed.downloaded,
        });
      } catch (error) {
        sourceErrors += 1;
        const message = error instanceof Error ? error.message : "Falha desconhecida";
        logIngestion("error", "source.failed", { runId, sourceKey: source.key, message });

        if (state?.metadata) {
          processedSources.push({
            source,
            changed: false,
            downloaded: false,
            etag: state.sourceEtag,
            lastModified: state.sourceLastModified,
            size: state.sourceSize,
            hash: state.sourceHash,
            snapshot: state.metadata,
            processingStatus: "stale",
            errorMessage: message,
          });
          issues.push({
            level: "warning",
            code: "SOURCE_STALE_FALLBACK",
            message: `${source.key} usou o último snapshot válido.`,
          });
        }
      }
    }

    const changed = processedSources.some((source) => source.changed);
    const allDocuments = processedSources.flatMap((source) => source.snapshot.documents);
    const candidates: FundamentalCandidate[] = [];
    const calculationCompletedTickers: string[] = [];

    if (changed || sourceErrors > 0 || retryPreviousPartialRun) {
      for (const company of companies) {
        let result;
        try {
          result = calculateCompanyFundamentals(company, allDocuments);
        } catch (error) {
          calculationErrors += 1;
          const message = error instanceof Error ? error.message : "Falha desconhecida";
          logIngestion("error", "fundamentals.failed", {
            runId,
            ticker: company.ticker,
            message,
          });
          continue;
        }
        if (result.status === "unavailable") {
          calculationCompletedTickers.push(company.ticker);
          issues.push({
            level: "warning",
            code: "FUNDAMENTALS_UNAVAILABLE",
            message: `${company.ticker}: ${result.failure.reason}`,
          });
          logIngestion("warn", "fundamentals.skipped", {
            runId,
            ticker: company.ticker,
            reason: result.failure.reason,
          });
          continue;
        }

        const validation = validateFundamentalCandidate(result.candidate, company);
        issues.push(...validation);
        for (const issue of validation) {
          logIngestion(issue.level === "error" ? "error" : "warn", "validation.issue", {
            runId,
            ticker: company.ticker,
            code: issue.code,
            message: issue.message,
          });
        }
        if (validation.some((issue) => issue.level === "error")) {
          calculationCompletedTickers.push(company.ticker);
          logIngestion("error", "fundamentals.invalid", {
            runId,
            ticker: company.ticker,
            issues: validation.map((issue) => issue.code),
          });
          continue;
        }

        const current = await session.getCurrentFundamental(company.ticker);
        const variationWarnings = createVariationWarnings(
            result.candidate,
            current
              ? {
                  eps: current.eps,
                  bookValuePerShare: current.bookValuePerShare,
                  outstandingShares: current.outstandingShares,
                }
              : null,
          );
        issues.push(...variationWarnings);
        for (const warning of variationWarnings) {
          logIngestion("warn", "validation.warning", {
            runId,
            ticker: company.ticker,
            code: warning.code,
            message: warning.message,
          });
        }
        candidates.push(result.candidate);
        calculationCompletedTickers.push(company.ticker);
      }
    }

    const processingErrors = companySyncErrors + sourceErrors + calculationErrors;
    const status = !changed && processingErrors === 0
      ? "unchanged"
      : processingErrors > 0
        ? "partial"
        : "success";
    const committed = await session.commitSuccessfulRun({
      runId,
      sources: processedSources,
      candidates,
      issues,
      companiesProcessed: companies.length,
      documentsChecked: sources.length,
      processingErrors,
      status,
      legacyReplacement:
        (changed || retryPreviousPartialRun) &&
        companySyncErrors === 0 &&
        sourceErrors === 0 &&
        processedSources.length === sources.length &&
        processedSources.every((source) => source.processingStatus === "success")
          ? {
              processedTickers: calculationCompletedTickers,
              currentMethodMarker: FUNDAMENTALS_PIPELINE_REVISION,
            }
          : undefined,
      runMetadata: {
        companiesDiscovered: companySync?.companiesDiscovered ?? null,
        companiesUpserted: companySync?.companiesUpserted ?? null,
        companiesDeactivated: companySync?.companiesDeactivated ?? null,
        automaticCompanies: companySync?.fundamentalsEnabled ?? null,
        b3SourceDate: companySync?.b3SourceDate ?? null,
        b3Validated: companySync?.b3Validated ?? false,
      },
    });

    for (const candidate of candidates) {
      logIngestion("info", "fundamentals.processed", {
        runId,
        ticker: candidate.ticker,
        referenceDate: candidate.referenceDate,
        documentType: candidate.documentType,
        documentVersion: candidate.documentVersion,
      });
    }

    const summary: IngestionSummary = {
      status,
      runId,
      documentsChecked: sources.length,
      documentsDownloaded: processedSources.filter((source) => source.downloaded).length,
      companiesProcessed: companies.length,
      fundamentalsInserted: committed.inserted,
      fundamentalsUpdated: committed.updated,
      fundamentalsIgnored: committed.ignored,
      fundamentalsRemoved: committed.removed,
      warnings: issues.filter((issue) => issue.level === "warning").length,
      errors: issues.filter((issue) => issue.level === "error").length + processingErrors,
      companiesDiscovered: companySync?.companiesDiscovered ?? 0,
      companiesUpserted: companySync?.companiesUpserted ?? 0,
      companiesDeactivated: companySync?.companiesDeactivated ?? 0,
      automaticCompanies: companySync?.fundamentalsEnabled ?? companies.length,
      b3SourceDate: companySync?.b3SourceDate ?? null,
    };
    logIngestion("info", "ingestion.finished", {
      status: summary.status,
      runId: summary.runId,
      documentsChecked: summary.documentsChecked,
      documentsDownloaded: summary.documentsDownloaded,
      companiesProcessed: summary.companiesProcessed,
      fundamentalsInserted: summary.fundamentalsInserted,
      fundamentalsUpdated: summary.fundamentalsUpdated,
      fundamentalsIgnored: summary.fundamentalsIgnored,
      fundamentalsRemoved: summary.fundamentalsRemoved,
      warnings: summary.warnings,
      errors: summary.errors,
      companiesDiscovered: summary.companiesDiscovered,
      companiesDeactivated: summary.companiesDeactivated,
      automaticCompanies: summary.automaticCompanies,
      b3SourceDate: summary.b3SourceDate,
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    await session.failRun(runId, message);
    logIngestion("error", "ingestion.failed", { runId, message });
    throw error;
  }
}

export async function runFundamentalsIngestion(
  options: { sourceLoader?: SourceLoader; now?: Date } = {},
): Promise<IngestionSummary> {
  const locked = await withIngestionLock((session) =>
    runLockedPipeline(
      session,
      options.sourceLoader ?? loadCvmSource,
      options.now ?? new Date(),
    ),
  );

  if (!locked.acquired) {
    return {
      status: "already-running",
      runId: null,
      documentsChecked: 0,
      documentsDownloaded: 0,
      companiesProcessed: 0,
      fundamentalsInserted: 0,
      fundamentalsUpdated: 0,
      fundamentalsIgnored: 0,
      fundamentalsRemoved: 0,
      warnings: 0,
      errors: 0,
    };
  }

  return locked.value as IngestionSummary;
}
