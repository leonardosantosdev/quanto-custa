import { normalizeText } from "@/lib/cvm/normalizers";
import type { CvmDocumentBundle, CvmStatementRow } from "@/lib/cvm/types";

export type StatementBasis = "consolidated" | "individual";

export function rowMatchesBasis(
  row: CvmStatementRow,
  basis: StatementBasis,
): boolean {
  const group = normalizeText(row.statementGroup);
  return basis === "consolidated"
    ? group.includes("CONSOLIDADO")
    : group.includes("INDIVIDUAL");
}

export function selectStatementBasis(
  bundle: CvmDocumentBundle,
): StatementBasis | null {
  for (const basis of ["consolidated", "individual"] as const) {
    const hasIncome = bundle.incomeRows.some((row) => rowMatchesBasis(row, basis));
    const hasBalance = bundle.balanceRows.some((row) => rowMatchesBasis(row, basis));
    if (hasIncome && hasBalance) return basis;
  }
  return null;
}
