import type { FundamentalCandidate } from "@/lib/cvm/types";
import {
  isSameFundamentalDocument,
  shouldReplaceFundamental,
  type ComparableFundamentalMetadata,
} from "@/lib/cvm/selectors/documents";

export type FundamentalWriteDecision = "insert" | "update" | "ignore-identical" | "ignore-older";

export function decideFundamentalWrite(
  candidate: FundamentalCandidate,
  current: ComparableFundamentalMetadata | null,
): FundamentalWriteDecision {
  if (!current) return "insert";
  if (isSameFundamentalDocument(candidate, current)) {
    return candidate.calculationMethod === current.calculationMethod
      ? "ignore-identical"
      : "update";
  }
  return shouldReplaceFundamental(candidate, current) ? "update" : "ignore-older";
}

export function fundamentalHistoryKey(candidate: FundamentalCandidate): string {
  return [
    candidate.ticker,
    candidate.referenceDate,
    candidate.documentType,
    candidate.documentVersion,
    candidate.calculationMethod,
  ].join(":");
}
