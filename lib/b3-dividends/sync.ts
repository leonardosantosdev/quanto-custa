import { loadB3CompanySupplement } from "@/lib/b3-dividends/client";
import { parseB3DividendSnapshot } from "@/lib/b3-dividends/parser";
import type {
  DividendSyncSummary,
  DividendSyncTarget,
} from "@/lib/b3-dividends/types";
import {
  listDividendSyncTargets,
  saveDividendSnapshot,
  saveDividendSyncFailure,
  withDividendSyncLock,
} from "@/lib/db/dividend-ingestion";

const DAILY_ISSUER_BATCH_SIZE = 48;
const FULL_SYNC_LIMIT = 10_000;
const CONCURRENCY = 6;

async function syncTarget(
  target: DividendSyncTarget,
  now: Date,
): Promise<{ events: number; warnings: number; failed: boolean }> {
  try {
    const source = await loadB3CompanySupplement(target.issuingCompany);
    const parsed = parseB3DividendSnapshot({
      snapshot: source,
      targets: target.companies,
      now,
    });
    const events = await saveDividendSnapshot({
      target,
      snapshot: parsed,
      warnings: parsed.warnings,
    });
    return { events, warnings: parsed.warnings.length, failed: false };
  } catch (error) {
    await saveDividendSyncFailure(target.issuingCompany, error);
    return { events: 0, warnings: 1, failed: true };
  }
}

async function runWorkers(
  targets: readonly DividendSyncTarget[],
  now: Date,
): Promise<Array<{ events: number; warnings: number; failed: boolean }>> {
  const results: Array<{ events: number; warnings: number; failed: boolean }> = [];
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < targets.length) {
      const target = targets[nextIndex];
      nextIndex += 1;
      results.push(await syncTarget(target, now));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()),
  );
  return results;
}

export async function runDividendSync(options: {
  full?: boolean;
  now?: Date;
} = {}): Promise<DividendSyncSummary> {
  const full = options.full ?? false;
  const now = options.now ?? new Date();
  const locked = await withDividendSyncLock(async () => {
    const targets = await listDividendSyncTargets(
      full ? FULL_SYNC_LIMIT : DAILY_ISSUER_BATCH_SIZE,
    );
    const results = await runWorkers(targets, now);
    const issuersFailed = results.filter((result) => result.failed).length;
    return {
      status: issuersFailed > 0 ? ("partial" as const) : ("success" as const),
      issuersChecked: targets.length,
      issuersUpdated: targets.length - issuersFailed,
      issuersFailed,
      eventsUpserted: results.reduce((sum, result) => sum + result.events, 0),
      warnings: results.reduce((sum, result) => sum + result.warnings, 0),
      full,
    };
  });

  if (!locked.acquired) {
    return {
      status: "already-running",
      issuersChecked: 0,
      issuersUpdated: 0,
      issuersFailed: 0,
      eventsUpserted: 0,
      warnings: 0,
      full,
    };
  }
  return locked.value as DividendSyncSummary;
}
