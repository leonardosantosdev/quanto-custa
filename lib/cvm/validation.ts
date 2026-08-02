import { isValidIsoDate, normalizeText } from "@/lib/cvm/normalizers";
import type {
  FundamentalCandidate,
  TrackedCompany,
  ValidationIssue,
} from "@/lib/cvm/types";

const LIMITS = {
  absoluteEps: 100_000,
  absoluteBookValuePerShare: 1_000_000,
} as const;

export function validateFundamentalCandidate(
  candidate: FundamentalCandidate,
  company: TrackedCompany,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(candidate.eps)) {
    issues.push({ level: "error", code: "EPS_NOT_FINITE", message: "LPA não é finito." });
  }
  if (!Number.isFinite(candidate.bookValuePerShare)) {
    issues.push({ level: "error", code: "VPA_NOT_FINITE", message: "VPA não é finito." });
  }
  if (candidate.calculationDetails.outstandingShares <= 0) {
    issues.push({ level: "error", code: "SHARES_NOT_POSITIVE", message: "Quantidade de ações não é positiva." });
  }
  if (!isValidIsoDate(candidate.referenceDate)) {
    issues.push({ level: "error", code: "INVALID_REFERENCE_DATE", message: "Data de referência inválida." });
  }
  if (candidate.sourceCvmCode !== company.cvmCode) {
    issues.push({ level: "error", code: "CVM_CODE_MISMATCH", message: "Código CVM não corresponde à empresa." });
  }
  if (
    !["MIL", "REAL", "UNIDADE"].includes(
      normalizeText(candidate.calculationDetails.monetaryScale),
    )
  ) {
    issues.push({ level: "error", code: "UNKNOWN_MONETARY_SCALE", message: "Escala monetária não reconhecida." });
  }
  if (!["consolidated", "individual"].includes(candidate.calculationDetails.statementBasis)) {
    issues.push({ level: "error", code: "STATEMENT_BASIS_INVALID", message: "Base da demonstração não é reconhecida." });
  }
  if (Math.abs(candidate.eps) > LIMITS.absoluteEps) {
    issues.push({ level: "error", code: "EPS_OUT_OF_RANGE", message: "LPA ultrapassa o limite configurado." });
  }
  if (Math.abs(candidate.bookValuePerShare) > LIMITS.absoluteBookValuePerShare) {
    issues.push({ level: "error", code: "VPA_OUT_OF_RANGE", message: "VPA ultrapassa o limite configurado." });
  }

  return issues;
}

function variationPercent(current: number, next: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(next) || current === 0) return null;
  return (Math.abs(next - current) / Math.abs(current)) * 100;
}

export function createVariationWarnings(
  candidate: FundamentalCandidate,
  current: {
    eps: number;
    bookValuePerShare: number;
    outstandingShares: number | null;
  } | null,
): ValidationIssue[] {
  if (!current) return [];
  const issues: ValidationIssue[] = [];
  const epsVariation = variationPercent(current.eps, candidate.eps);
  const vpaVariation = variationPercent(
    current.bookValuePerShare,
    candidate.bookValuePerShare,
  );
  const sharesVariation = current.outstandingShares
    ? variationPercent(
        current.outstandingShares,
        candidate.calculationDetails.outstandingShares,
      )
    : null;

  if (epsVariation !== null && epsVariation > 80) {
    issues.push({ level: "warning", code: "EPS_LARGE_VARIATION", message: `LPA variou ${epsVariation.toFixed(1)}%.` });
  }
  if (vpaVariation !== null && vpaVariation > 50) {
    issues.push({ level: "warning", code: "VPA_LARGE_VARIATION", message: `VPA variou ${vpaVariation.toFixed(1)}%.` });
  }
  if (sharesVariation !== null && sharesVariation > 30) {
    issues.push({ level: "warning", code: "SHARES_LARGE_VARIATION", message: `Quantidade de ações variou ${sharesVariation.toFixed(1)}%.` });
  }

  return issues;
}
