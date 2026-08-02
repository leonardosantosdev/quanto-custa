import { rowMatchesBasis, type StatementBasis } from "@/lib/cvm/calculations/basis";
import { normalizeMoney, normalizeText } from "@/lib/cvm/normalizers";
import type { CvmDocumentBundle, CvmStatementRow } from "@/lib/cvm/types";

export type IssuedSharesResult =
  | { status: "valid"; value: number; scale: number; rule: string }
  | { status: "unavailable"; reason: string };

function currentAccumulatedRows(
  rows: readonly CvmStatementRow[],
  bundle: CvmDocumentBundle,
  basis: StatementBasis,
): CvmStatementRow[] {
  return rows.filter(
    (row) =>
      rowMatchesBasis(row, basis) &&
      normalizeText(row.exerciseOrder) === "ULTIMO" &&
      row.endDate === bundle.metadata.referenceDate &&
      row.startDate !== null,
  );
}

export function selectAccumulatedControllerProfit(
  bundle: CvmDocumentBundle,
  basis: StatementBasis,
): CvmStatementRow | null {
  const preferredCodes = basis === "consolidated"
    ? ["3.11.01"]
    : ["3.11", "3.13"];
  return (
    currentAccumulatedRows(bundle.incomeRows, bundle, basis)
      .filter((row) => {
        const description = normalizeText(row.accountDescription);
        if (basis === "consolidated") {
          return (
            row.accountCode === "3.11.01" ||
            (description.includes("ATRIBUIDO") &&
              description.includes("CONTROLADOR") &&
              !description.includes("NAO CONTROLADOR"))
          );
        }
        return (
          ["3.11", "3.13"].includes(row.accountCode) ||
          description === "LUCRO PREJUIZO DO PERIODO" ||
          description === "RESULTADO LIQUIDO DO PERIODO"
        );
      })
      .sort((left, right) => {
        const leftPriority = preferredCodes.indexOf(left.accountCode);
        const rightPriority = preferredCodes.indexOf(right.accountCode);
        const normalizedLeft = leftPriority === -1 ? preferredCodes.length : leftPriority;
        const normalizedRight = rightPriority === -1 ? preferredCodes.length : rightPriority;
        return (
          normalizedLeft - normalizedRight ||
          (left.startDate ?? "").localeCompare(right.startDate ?? "")
        );
      })[0] ??
    null
  );
}

function reportedBasicEpsRows(
  bundle: CvmDocumentBundle,
  basis: StatementBasis,
): CvmStatementRow[] {
  return currentAccumulatedRows(bundle.incomeRows, bundle, basis).filter(
    (row) =>
      ["3.99", "3.99.01.01", "3.99.01.02"].includes(row.accountCode) &&
      normalizeText(row.currency) === "REAL" &&
      Number.isFinite(row.value) &&
      row.value !== 0,
  );
}

export function resolveIssuedShares(
  bundle: CvmDocumentBundle,
  basis: StatementBasis,
): IssuedSharesResult {
  const reported = bundle.capital?.issuedTotal;
  if (reported === null || reported === undefined || !Number.isFinite(reported) || reported <= 0) {
    return { status: "unavailable", reason: "Quantidade total de ações emitidas está ausente." };
  }
  if (reported > 100_000_000_000) {
    return {
      status: "unavailable",
      reason: "Quantidade de ações indica evento societário ainda não conciliado.",
    };
  }

  const profitRow = selectAccumulatedControllerProfit(bundle, basis);
  const profit = profitRow
    ? normalizeMoney(profitRow.value, profitRow.currency, profitRow.monetaryScale)
    : null;
  if (profit !== null && profit !== 0) {
    for (const epsRow of reportedBasicEpsRows(bundle, basis)) {
      if (Math.sign(epsRow.value) !== Math.sign(profit)) continue;
      const impliedWeightedShares = Math.abs(profit / epsRow.value);
      const ratio = impliedWeightedShares / reported;
      if (ratio >= 0.5 && ratio <= 2) {
        return {
          status: "valid",
          value: reported,
          scale: 1,
          rule: "issued_quantity_reconciled_with_reported_eps",
        };
      }
      if (ratio >= 500 && ratio <= 2_000) {
        return {
          status: "valid",
          value: reported * 1_000,
          scale: 1_000,
          rule: "issued_quantity_x1000_reconciled_with_reported_eps",
        };
      }
    }
  }

  if (reported >= 10_000_000) {
    return {
      status: "valid",
      value: reported,
      scale: 1,
      rule: "issued_quantity_as_reported",
    };
  }
  return {
    status: "unavailable",
    reason: "Escala da quantidade de ações não pôde ser confirmada.",
  };
}
