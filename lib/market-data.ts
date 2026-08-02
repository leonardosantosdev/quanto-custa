import { runDividendSync } from "@/lib/b3-dividends/sync";
import type { DividendSyncSummary } from "@/lib/b3-dividends/types";
import {
  runFundamentalsIngestion,
  type IngestionSummary,
} from "@/lib/cvm/pipeline";

export interface MarketDataUpdateSummary {
  status: "success" | "partial" | "already-running";
  fundamentals: IngestionSummary;
  dividends: DividendSyncSummary | null;
}

export async function runMarketDataUpdate(): Promise<MarketDataUpdateSummary> {
  const fundamentals = await runFundamentalsIngestion();
  if (fundamentals.status === "already-running") {
    return { status: "already-running", fundamentals, dividends: null };
  }

  const dividends = await runDividendSync();
  const status =
    fundamentals.status === "partial" || dividends.status === "partial"
      ? "partial"
      : dividends.status === "already-running"
        ? "already-running"
        : "success";
  return { status, fundamentals, dividends };
}
