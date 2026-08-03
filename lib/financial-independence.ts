export interface FinancialIndependenceInput {
  currentAge: number;
  targetAge: number;
  currentAssets: number;
  monthlyContribution: number;
  desiredMonthlyIncome: number;
  nominalAnnualReturnPercent: number;
  annualInflationPercent: number;
  annualWithdrawalRatePercent: number;
}

export type FinancialIndependenceResult =
  | {
      status: "valid";
      targetAssets: number;
      realAnnualReturnPercent: number;
      realMonthlyRate: number;
      monthsToTargetAge: number;
      projectedAssetsAtTargetAge: number;
      projectedIncomeAtTargetAge: number;
      totalContributedAtTargetAge: number;
      investmentGrowthAtTargetAge: number;
      requiredMonthlyContribution: number;
      targetReached: boolean;
      monthsUntilGoal: number | null;
      goalAge: number | null;
    }
  | { status: "invalid"; message: string };

function futureValue(
  currentAssets: number,
  monthlyContribution: number,
  monthlyRate: number,
  months: number,
): number {
  if (monthlyRate === 0) return currentAssets + monthlyContribution * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return currentAssets * factor + monthlyContribution * ((factor - 1) / monthlyRate);
}

function requiredContribution(
  targetAssets: number,
  currentAssets: number,
  monthlyRate: number,
  months: number,
): number {
  if (months <= 0) return targetAssets <= currentAssets ? 0 : Number.POSITIVE_INFINITY;
  if (monthlyRate === 0) return Math.max(0, (targetAssets - currentAssets) / months);
  const factor = Math.pow(1 + monthlyRate, months);
  const annuityFactor = (factor - 1) / monthlyRate;
  return Math.max(0, (targetAssets - currentAssets * factor) / annuityFactor);
}

function monthsToGoal(options: {
  targetAssets: number;
  currentAssets: number;
  monthlyContribution: number;
  monthlyRate: number;
  maxMonths: number;
}): number | null {
  if (options.currentAssets >= options.targetAssets) return 0;
  let assets = options.currentAssets;
  for (let month = 1; month <= options.maxMonths; month += 1) {
    assets = assets * (1 + options.monthlyRate) + options.monthlyContribution;
    if (assets >= options.targetAssets) return month;
  }
  return null;
}

export function calculateFinancialIndependence(
  input: FinancialIndependenceInput,
): FinancialIndependenceResult {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value))) {
    return { status: "invalid", message: "Informe somente valores numéricos válidos." };
  }
  if (!Number.isInteger(input.currentAge) || input.currentAge < 0 || input.currentAge > 119) {
    return { status: "invalid", message: "Informe uma idade atual válida." };
  }
  if (
    !Number.isInteger(input.targetAge) ||
    input.targetAge <= input.currentAge ||
    input.targetAge > 120
  ) {
    return {
      status: "invalid",
      message: "A idade desejada deve ser inteira, maior que a atual e de até 120 anos.",
    };
  }
  if (
    input.currentAssets < 0 ||
    input.monthlyContribution < 0 ||
    input.desiredMonthlyIncome <= 0 ||
    input.nominalAnnualReturnPercent < 0 ||
    input.annualInflationPercent < 0
  ) {
    return { status: "invalid", message: "Patrimônio, aportes e taxas não podem ser negativos." };
  }
  if (
    input.annualWithdrawalRatePercent <= 0 ||
    input.annualWithdrawalRatePercent > 100
  ) {
    return { status: "invalid", message: "A taxa de retirada deve estar entre 0% e 100%." };
  }

  const realAnnualReturn =
    (1 + input.nominalAnnualReturnPercent / 100) /
      (1 + input.annualInflationPercent / 100) -
    1;
  const realMonthlyRate = Math.pow(1 + realAnnualReturn, 1 / 12) - 1;
  const targetAssets =
    (input.desiredMonthlyIncome * 12) /
    (input.annualWithdrawalRatePercent / 100);
  const monthsToTargetAge = (input.targetAge - input.currentAge) * 12;
  const projectedAssetsAtTargetAge = futureValue(
    input.currentAssets,
    input.monthlyContribution,
    realMonthlyRate,
    monthsToTargetAge,
  );
  const totalContributedAtTargetAge =
    input.currentAssets + input.monthlyContribution * monthsToTargetAge;
  const requiredMonthlyContribution = requiredContribution(
    targetAssets,
    input.currentAssets,
    realMonthlyRate,
    monthsToTargetAge,
  );
  const monthsUntilGoal = monthsToGoal({
    targetAssets,
    currentAssets: input.currentAssets,
    monthlyContribution: input.monthlyContribution,
    monthlyRate: realMonthlyRate,
    maxMonths: (120 - input.currentAge) * 12,
  });

  return {
    status: "valid",
    targetAssets,
    realAnnualReturnPercent: realAnnualReturn * 100,
    realMonthlyRate,
    monthsToTargetAge,
    projectedAssetsAtTargetAge,
    projectedIncomeAtTargetAge:
      (projectedAssetsAtTargetAge * (input.annualWithdrawalRatePercent / 100)) / 12,
    totalContributedAtTargetAge,
    investmentGrowthAtTargetAge:
      projectedAssetsAtTargetAge - totalContributedAtTargetAge,
    requiredMonthlyContribution,
    targetReached: projectedAssetsAtTargetAge >= targetAssets,
    monthsUntilGoal,
    goalAge:
      monthsUntilGoal === null ? null : input.currentAge + monthsUntilGoal / 12,
  };
}
