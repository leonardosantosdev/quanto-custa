import {
  selectStatementBasis,
  type StatementBasis,
} from "@/lib/cvm/calculations/basis";
import {
  resolveIssuedShares,
  selectAccumulatedControllerProfit,
} from "@/lib/cvm/calculations/shares";
import { normalizeMoney } from "@/lib/cvm/normalizers";
import type {
  CvmDocumentBundle,
  CvmStatementRow,
} from "@/lib/cvm/types";

export type LpaResult =
  | {
      status: "valid";
      value: number;
      accountCode: string;
      periods: string[];
      method:
        | "cvm_controller_profit_annual_over_issued_shares"
        | "cvm_controller_profit_ttm_over_issued_shares";
      profitAmount: number;
      issuedShares: number;
      shareQuantityScale: number;
      shareQuantityRule: string;
      statementBasis: StatementBasis;
    }
  | { status: "unavailable"; reason: string };

function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(`${end}T00:00:00.000Z`).getTime() -
      new Date(`${start}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

function normalizedProfit(row: CvmStatementRow | null): number | null {
  return row
    ? normalizeMoney(row.value, row.currency, row.monetaryScale)
    : null;
}

function findComparableBundle(
  documents: readonly CvmDocumentBundle[],
  cvmCode: string,
  type: "ITR" | "DFP",
  referenceDate: string,
): CvmDocumentBundle | null {
  return (
    documents.find(
      (document) =>
        document.metadata.cvmCode === cvmCode &&
        document.metadata.documentType === type &&
        document.metadata.referenceDate === referenceDate,
    ) ?? null
  );
}

function previousYearDate(date: string): string {
  return `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
}

function profitForBasis(
  bundle: CvmDocumentBundle | null,
  basis: StatementBasis,
): CvmStatementRow | null {
  if (!bundle) return null;
  return selectAccumulatedControllerProfit(bundle, basis);
}

export function calculateTrailingEps(
  latest: CvmDocumentBundle,
  documents: readonly CvmDocumentBundle[],
): LpaResult {
  const basis = selectStatementBasis(latest);
  if (!basis) {
    return {
      status: "unavailable",
      reason: "DRE e balanço não estão disponíveis na mesma base contábil.",
    };
  }
  const shares = resolveIssuedShares(latest, basis);
  if (shares.status === "unavailable") return shares;

  const currentRow = selectAccumulatedControllerProfit(latest, basis);
  const currentProfit = normalizedProfit(currentRow);
  if (!currentRow || currentRow.startDate === null || currentProfit === null) {
    return {
      status: "unavailable",
      reason: "Lucro atribuível ao controlador não está disponível.",
    };
  }

  if (
    latest.metadata.documentType === "DFP" &&
    daysBetween(currentRow.startDate, currentRow.endDate) >= 330
  ) {
    return {
      status: "valid",
      value: currentProfit / shares.value,
      accountCode: currentRow.accountCode,
      periods: [`${currentRow.startDate}/${currentRow.endDate}`],
      method: "cvm_controller_profit_annual_over_issued_shares",
      profitAmount: currentProfit,
      issuedShares: shares.value,
      shareQuantityScale: shares.scale,
      shareQuantityRule: shares.rule,
      statementBasis: basis,
    };
  }
  if (latest.metadata.documentType !== "ITR") {
    return { status: "unavailable", reason: "Documento não cobre doze meses." };
  }

  const priorReference = previousYearDate(latest.metadata.referenceDate);
  const priorItr = findComparableBundle(
    documents,
    latest.metadata.cvmCode,
    "ITR",
    priorReference,
  );
  const priorDfpReference = `${Number(latest.metadata.referenceDate.slice(0, 4)) - 1}-12-31`;
  const priorDfp = findComparableBundle(
    documents,
    latest.metadata.cvmCode,
    "DFP",
    priorDfpReference,
  );
  const priorYtdRow = profitForBasis(priorItr, basis);
  const annualRow = profitForBasis(priorDfp, basis);
  const priorYtdProfit = normalizedProfit(priorYtdRow);
  const annualProfit = normalizedProfit(annualRow);

  if (
    !priorYtdRow ||
    !annualRow ||
    priorYtdRow.startDate === null ||
    annualRow.startDate === null ||
    priorYtdProfit === null ||
    annualProfit === null ||
    daysBetween(annualRow.startDate, annualRow.endDate) < 330
  ) {
    return {
      status: "unavailable",
      reason: "DFP anual ou ITR comparável não permite calcular o lucro dos últimos 12 meses.",
    };
  }

  const trailingProfit = annualProfit + currentProfit - priorYtdProfit;
  if (!Number.isFinite(trailingProfit)) {
    return { status: "unavailable", reason: "Lucro dos últimos 12 meses não é finito." };
  }
  return {
    status: "valid",
    value: trailingProfit / shares.value,
    accountCode: currentRow.accountCode,
    periods: [
      `${annualRow.startDate}/${annualRow.endDate}`,
      `${currentRow.startDate}/${currentRow.endDate}`,
      `-${priorYtdRow.startDate}/${priorYtdRow.endDate}`,
    ],
    method: "cvm_controller_profit_ttm_over_issued_shares",
    profitAmount: trailingProfit,
    issuedShares: shares.value,
    shareQuantityScale: shares.scale,
    shareQuantityRule: shares.rule,
    statementBasis: basis,
  };
}
