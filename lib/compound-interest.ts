export type InterestRatePeriod = "monthly" | "annual";
export type InvestmentTermUnit = "months" | "years";

export interface CompoundInterestInput {
  initialAmount: number;
  monthlyContribution: number;
  interestRatePercent: number;
  interestRatePeriod: InterestRatePeriod;
  term: number;
  termUnit: InvestmentTermUnit;
}

export type CompoundInterestResult =
  | {
      status: "valid";
      finalAmount: number;
      totalInvested: number;
      totalInterest: number;
      monthlyRate: number;
      months: number;
    }
  | { status: "invalid"; message: string };

export function calculateCompoundInterest(
  input: CompoundInterestInput,
): CompoundInterestResult {
  const values = [
    input.initialAmount,
    input.monthlyContribution,
    input.interestRatePercent,
    input.term,
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    return { status: "invalid", message: "Informe somente valores numéricos válidos." };
  }
  if (
    input.initialAmount < 0 ||
    input.monthlyContribution < 0 ||
    input.interestRatePercent < 0
  ) {
    return { status: "invalid", message: "Valores monetários e taxa não podem ser negativos." };
  }
  if (input.term <= 0 || !Number.isInteger(input.term)) {
    return { status: "invalid", message: "O prazo deve ser um número inteiro maior que zero." };
  }

  const months = input.termUnit === "years" ? input.term * 12 : input.term;
  const statedRate = input.interestRatePercent / 100;
  const monthlyRate =
    input.interestRatePeriod === "annual"
      ? Math.pow(1 + statedRate, 1 / 12) - 1
      : statedRate;
  const growthFactor = Math.pow(1 + monthlyRate, months);
  const contributionsFutureValue =
    monthlyRate === 0
      ? input.monthlyContribution * months
      : input.monthlyContribution * ((growthFactor - 1) / monthlyRate);
  const finalAmount = input.initialAmount * growthFactor + contributionsFutureValue;
  const totalInvested = input.initialAmount + input.monthlyContribution * months;

  return {
    status: "valid",
    finalAmount,
    totalInvested,
    totalInterest: finalAmount - totalInvested,
    monthlyRate,
    months,
  };
}
