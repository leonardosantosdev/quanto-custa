import {
  rowMatchesBasis,
  selectStatementBasis,
  type StatementBasis,
} from "@/lib/cvm/calculations/basis";
import { resolveIssuedShares } from "@/lib/cvm/calculations/shares";
import { normalizeMoney, normalizeText } from "@/lib/cvm/normalizers";
import type {
  CvmDocumentBundle,
  CvmStatementRow,
} from "@/lib/cvm/types";

export type VpaResult =
  | {
      status: "valid";
      value: number;
      equity: number;
      outstandingShares: number;
      shareQuantityScale: number;
      shareQuantityRule: string;
      equityAccountCodes: string[];
      monetaryScale: string;
      classRule: string;
      statementBasis: StatementBasis;
    }
  | { status: "unavailable"; reason: string };

function currentRows(
  bundle: CvmDocumentBundle,
  basis: StatementBasis,
): CvmStatementRow[] {
  return bundle.balanceRows.filter(
    (row) =>
      rowMatchesBasis(row, basis) &&
      normalizeText(row.exerciseOrder) === "ULTIMO" &&
      row.endDate === row.referenceDate,
  );
}

function resolveEquity(
  rows: readonly CvmStatementRow[],
  basis: StatementBasis,
): { value: number; accountCodes: string[]; scale: string } | null {
  if (basis === "individual") {
    const equity = rows.find((row) =>
      normalizeText(row.accountDescription) === "PATRIMONIO LIQUIDO",
    );
    if (!equity) return null;
    const value = normalizeMoney(equity.value, equity.currency, equity.monetaryScale);
    return value === null
      ? null
      : { value, accountCodes: [equity.accountCode], scale: equity.monetaryScale };
  }

  const direct = rows.find((row) => {
    const description = normalizeText(row.accountDescription);
    return (
      description.includes("PATRIMONIO LIQUIDO") &&
      (description.includes("ATRIBUIDO AO CONTROLADOR") ||
        description.includes("ATRIBUIDO AOS CONTROLADORES") ||
        description.includes("ATRIBUIVEL AOS ACIONISTAS CONTROLADORES")) &&
      !description.includes("NAO CONTROLADOR")
    );
  });
  if (direct) {
    const value = normalizeMoney(direct.value, direct.currency, direct.monetaryScale);
    return value === null
      ? null
      : { value, accountCodes: [direct.accountCode], scale: direct.monetaryScale };
  }

  const consolidated = rows.find(
    (row) => normalizeText(row.accountDescription) === "PATRIMONIO LIQUIDO CONSOLIDADO",
  );
  const nonControlling = rows.find((row) => {
    const description = normalizeText(row.accountDescription);
    return (
      description.includes("PARTICIPACAO DOS ACIONISTAS NAO CONTROLADORES") ||
      description.includes("PATRIMONIO LIQUIDO ATRIBUIDO AOS NAO CONTROLADORES")
    );
  });
  if (!consolidated) return null;
  const total = normalizeMoney(
    consolidated.value,
    consolidated.currency,
    consolidated.monetaryScale,
  );
  const minority = nonControlling
    ? normalizeMoney(
        nonControlling.value,
        nonControlling.currency,
        nonControlling.monetaryScale,
      )
    : 0;
  if (total === null || minority === null) return null;
  return {
    value: total - minority,
    accountCodes: [
      consolidated.accountCode,
      ...(nonControlling ? [nonControlling.accountCode] : []),
    ],
    scale: consolidated.monetaryScale,
  };
}

export function calculateBookValuePerShare(
  bundle: CvmDocumentBundle,
): VpaResult {
  const basis = selectStatementBasis(bundle);
  if (!basis) {
    return {
      status: "unavailable",
      reason: "DRE e balanço não estão disponíveis na mesma base contábil.",
    };
  }
  const shares = resolveIssuedShares(bundle, basis);
  if (shares.status === "unavailable") return shares;
  const equity = resolveEquity(currentRows(bundle, basis), basis);
  if (!equity || !Number.isFinite(equity.value)) {
    return {
      status: "unavailable",
      reason: "Patrimônio atribuível aos controladores não identificado.",
    };
  }
  return {
    status: "valid",
    value: equity.value / shares.value,
    equity: equity.value,
    outstandingShares: shares.value,
    shareQuantityScale: shares.scale,
    shareQuantityRule: shares.rule,
    equityAccountCodes: equity.accountCodes,
    monetaryScale: equity.scale,
    classRule: "company_level_total_issued_shares",
    statementBasis: basis,
  };
}
