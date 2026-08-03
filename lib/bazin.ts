export const DEFAULT_BAZIN_YIELD_PERCENT = 6;
export const JCP_IR_RATE_UNTIL_2025 = 0.15;
export const JCP_IR_RATE_FROM_2026 = 0.175;

export function jcpNetFactor(referenceDate: string): number {
  const incomeTaxRate =
    referenceDate >= "2026-01-01"
      ? JCP_IR_RATE_FROM_2026
      : JCP_IR_RATE_UNTIL_2025;
  return 1 - incomeTaxRate;
}

export type BazinInvalidReason =
  | "missing-proceeds"
  | "invalid-proceeds"
  | "non-positive-proceeds"
  | "invalid-yield"
  | "non-positive-yield";

export type BazinResult =
  | {
      status: "valid";
      value: number;
      annualProceedsPerShare: number;
      minimumYieldPercent: number;
    }
  | { status: "invalid"; reason: BazinInvalidReason; message: string };

export interface BazinInput {
  annualProceedsPerShare?: number | null;
  minimumYieldPercent?: number | null;
}

export function calculateBazinPriceCeiling({
  annualProceedsPerShare,
  minimumYieldPercent = DEFAULT_BAZIN_YIELD_PERCENT,
}: BazinInput): BazinResult {
  if (annualProceedsPerShare === null || annualProceedsPerShare === undefined) {
    return {
      status: "invalid",
      reason: "missing-proceeds",
      message: "Os proventos por ação dos últimos 12 meses não estão disponíveis.",
    };
  }

  if (!Number.isFinite(annualProceedsPerShare)) {
    return {
      status: "invalid",
      reason: "invalid-proceeds",
      message: "O total de proventos informado não é um número válido.",
    };
  }

  if (annualProceedsPerShare <= 0) {
    return {
      status: "invalid",
      reason: "non-positive-proceeds",
      message: "O método exige proventos por ação maiores que zero.",
    };
  }

  if (minimumYieldPercent === null || !Number.isFinite(minimumYieldPercent)) {
    return {
      status: "invalid",
      reason: "invalid-yield",
      message: "O retorno mínimo informado não é um número válido.",
    };
  }

  if (minimumYieldPercent <= 0 || minimumYieldPercent > 100) {
    return {
      status: "invalid",
      reason: "non-positive-yield",
      message: "Informe um retorno mínimo maior que 0% e de até 100%.",
    };
  }

  return {
    status: "valid",
    value: annualProceedsPerShare / (minimumYieldPercent / 100),
    annualProceedsPerShare,
    minimumYieldPercent,
  };
}
