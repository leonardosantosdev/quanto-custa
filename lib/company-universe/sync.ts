import { createHash } from "node:crypto";

import { SEED_COMPANIES } from "@/data/companies";
import {
  loadCurrentFcaSecuritiesCsv,
  loadCvmRegistryCsv,
  loadLatestB3InstrumentSnapshot,
} from "@/lib/company-universe/client";
import {
  buildCompanyUniverse,
  parseCvmRegistryCsv,
  parseFcaSecuritiesCsv,
} from "@/lib/company-universe/parser";
import type {
  B3InstrumentSnapshot,
  CompanySyncRecord,
  CompanyUniverseSyncSummary,
  UniverseWarning,
} from "@/lib/company-universe/types";
import { logIngestion } from "@/lib/cvm/logger";
import {
  PostgresIngestionSession,
  withIngestionLock,
} from "@/lib/db/ingestion-repository";

const B3_SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function hashCompanyUniverse(companies: readonly CompanySyncRecord[]): string {
  const identity = companies
    .map((company) => [
      company.ticker,
      company.cvmCode,
      company.cnpj,
      company.companyName,
      company.shareClass,
      company.shareClassDetail,
      company.fundamentalsEnabled ? "1" : "0",
      company.isActive ? "1" : "0",
      company.discoverySource,
    ].join(":"))
    .sort()
    .join("|");
  return createHash("sha256").update(identity).digest("hex");
}

function mergeManualOverrides(
  automaticCompanies: readonly CompanySyncRecord[],
): CompanySyncRecord[] {
  const companies = new Map(
    automaticCompanies.map((company) => [company.ticker, company]),
  );

  for (const company of SEED_COMPANIES) {
    const ticker = company.ticker.toUpperCase();
    companies.set(ticker, {
      ticker,
      cvmCode: company.cvmCode,
      cnpj: company.cnpj,
      companyName: company.companyName,
      shareClass: company.shareClass,
      shareClassDetail: company.shareClassDetail ?? company.shareClass,
      fundamentalsEnabled: company.fundamentalsEnabled ?? true,
      isActive: company.isActive,
      discoverySource: "manual",
    });
  }

  return [...companies.values()].sort((left, right) =>
    left.ticker.localeCompare(right.ticker),
  );
}

async function resolveB3Snapshot(
  session: PostgresIngestionSession,
  now: Date,
  warnings: UniverseWarning[],
): Promise<{
  snapshot: B3InstrumentSnapshot | null;
  fresh: boolean;
}> {
  const stored = await session.getStoredB3Snapshot();
  const storedAge = stored
    ? now.getTime() - new Date(stored.lastCheckedAt).getTime()
    : Number.POSITIVE_INFINITY;
  if (
    stored &&
    Number.isFinite(storedAge) &&
    storedAge < B3_SNAPSHOT_MAX_AGE_MS &&
    stored.snapshot.schemaVersion === 2 &&
    (stored.snapshot.listedCompanies?.length ?? 0) > 0
  ) {
    return { snapshot: stored.snapshot, fresh: false };
  }

  try {
    return {
      snapshot: await loadLatestB3InstrumentSnapshot(now),
      fresh: true,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha desconhecida";
    if (stored) {
      warnings.push({
        code: "B3_STALE_FALLBACK",
        message: `A B3 não pôde ser atualizada; o último cadastro válido foi usado. ${reason}`,
      });
      return { snapshot: stored.snapshot, fresh: false };
    }
    warnings.push({
      code: "B3_VALIDATION_UNAVAILABLE",
      message: `A validação auxiliar da B3 não estava disponível. ${reason}`,
    });
    return { snapshot: null, fresh: false };
  }
}

export async function runCompanyUniverseSyncWithSession(
  session: PostgresIngestionSession,
  options: { now?: Date } = {},
): Promise<CompanyUniverseSyncSummary> {
  const now = options.now ?? new Date();
  const warnings: UniverseWarning[] = [];
  logIngestion("info", "company_universe.started");

  const [fca, registry, b3] = await Promise.all([
    loadCurrentFcaSecuritiesCsv(now),
    loadCvmRegistryCsv(),
    resolveB3Snapshot(session, now, warnings),
  ]);
  const built = buildCompanyUniverse({
    fcaSecurities: parseFcaSecuritiesCsv(fca.csv),
    registryCompanies: parseCvmRegistryCsv(registry.csv),
    b3Tickers: b3.snapshot ? new Set(b3.snapshot.tickers) : undefined,
    b3ListedCompanies: b3.snapshot?.listedCompanies,
    today: isoDate(now),
  });
  warnings.push(...built.warnings);

  const companies = mergeManualOverrides(built.companies);
  const applied = await session.applyCompanyUniverse({
    companies,
    warnings,
    fcaUrl: fca.url,
    registryUrl: registry.url,
    universeHash: hashCompanyUniverse(companies),
    b3Snapshot: b3.snapshot,
    b3SnapshotFresh: b3.fresh,
  });
  const summary: CompanyUniverseSyncSummary = {
    status: b3.snapshot ? "success" : "partial",
    universeChanged: applied.changed,
    companiesDiscovered: built.companies.length,
    companiesUpserted: applied.upserted,
    companiesDeactivated: applied.deactivated,
    fundamentalsEnabled: companies.filter(
      (company) => company.isActive && company.fundamentalsEnabled,
    ).length,
    b3SourceDate: b3.snapshot?.sourceDate ?? null,
    b3Validated: Boolean(b3.snapshot),
    warnings,
  };
  logIngestion(summary.status === "partial" ? "warn" : "info", "company_universe.finished", {
    status: summary.status,
    universeChanged: summary.universeChanged,
    companiesDiscovered: summary.companiesDiscovered,
    companiesUpserted: summary.companiesUpserted,
    companiesDeactivated: summary.companiesDeactivated,
    fundamentalsEnabled: summary.fundamentalsEnabled,
    b3SourceDate: summary.b3SourceDate,
    warnings: summary.warnings.length,
  });
  return summary;
}

export async function runCompanyUniverseSync(
  options: { now?: Date } = {},
): Promise<CompanyUniverseSyncSummary> {
  const locked = await withIngestionLock((session) =>
    runCompanyUniverseSyncWithSession(session, options),
  );
  if (!locked.acquired) {
    return {
      status: "already-running",
      universeChanged: false,
      companiesDiscovered: 0,
      companiesUpserted: 0,
      companiesDeactivated: 0,
      fundamentalsEnabled: 0,
      b3SourceDate: null,
      b3Validated: false,
      warnings: [],
    };
  }
  return locked.value as CompanyUniverseSyncSummary;
}
