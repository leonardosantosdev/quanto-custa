export type FixedIncomeRateType = "cdi" | "fixed";
export type TaxTreatment = "regressive" | "exempt";

export interface FixedIncomeProductInput {
  name: string;
  taxTreatment: TaxTreatment;
  rateType: FixedIncomeRateType;
  ratePercent: number;
}

export interface FixedIncomeComparisonInput {
  initialAmount: number;
  termDays: number;
  cdiAnnualPercent: number;
  products: [FixedIncomeProductInput, FixedIncomeProductInput];
}

export interface FixedIncomeProductResult {
  name: string;
  taxTreatment: TaxTreatment;
  rateType: FixedIncomeRateType;
  ratePercent: number;
  annualGrossRatePercent: number;
  grossFinalAmount: number;
  grossEarnings: number;
  incomeTaxRatePercent: number;
  incomeTaxAmount: number;
  netEarnings: number;
  netFinalAmount: number;
  netReturnPercent: number;
  equivalentOppositeTaxCdiPercent: number | null;
}

export type FixedIncomeComparisonResult =
  | {
      status: "valid";
      products: [FixedIncomeProductResult, FixedIncomeProductResult];
      winner: 0 | 1 | null;
      difference: number;
    }
  | { status: "invalid"; message: string };

export function incomeTaxRate(termDays: number): number {
  if (termDays <= 180) return 0.225;
  if (termDays <= 360) return 0.2;
  if (termDays <= 720) return 0.175;
  return 0.15;
}

export function cdiPercentageToAnnualRate(
  cdiAnnualPercent: number,
  cdiPercentage: number,
): number {
  const cdiDailyRate = Math.pow(1 + cdiAnnualPercent / 100, 1 / 252) - 1;
  return Math.pow(1 + cdiDailyRate * (cdiPercentage / 100), 252) - 1;
}

function productAnnualRate(
  product: FixedIncomeProductInput,
  cdiAnnualPercent: number,
): number {
  return product.rateType === "cdi"
    ? cdiPercentageToAnnualRate(cdiAnnualPercent, product.ratePercent)
    : product.ratePercent / 100;
}

function projectProduct(options: {
  initialAmount: number;
  termDays: number;
  cdiAnnualPercent: number;
  product: FixedIncomeProductInput;
}): Omit<FixedIncomeProductResult, "equivalentOppositeTaxCdiPercent"> {
  const annualRate = productAnnualRate(options.product, options.cdiAnnualPercent);
  const grossFinalAmount =
    options.initialAmount * Math.pow(1 + annualRate, options.termDays / 365);
  const grossEarnings = grossFinalAmount - options.initialAmount;
  const taxRate =
    options.product.taxTreatment === "regressive"
      ? incomeTaxRate(options.termDays)
      : 0;
  const incomeTaxAmount = grossEarnings * taxRate;
  const netEarnings = grossEarnings - incomeTaxAmount;
  return {
    name: options.product.name,
    taxTreatment: options.product.taxTreatment,
    rateType: options.product.rateType,
    ratePercent: options.product.ratePercent,
    annualGrossRatePercent: annualRate * 100,
    grossFinalAmount,
    grossEarnings,
    incomeTaxRatePercent: taxRate * 100,
    incomeTaxAmount,
    netEarnings,
    netFinalAmount: options.initialAmount + netEarnings,
    netReturnPercent: (netEarnings / options.initialAmount) * 100,
  };
}

function findEquivalentCdiPercentage(options: {
  targetNetFinalAmount: number;
  initialAmount: number;
  termDays: number;
  cdiAnnualPercent: number;
  taxTreatment: TaxTreatment;
}): number | null {
  if (options.cdiAnnualPercent <= 0) return null;
  let low = 0;
  let high = 1_000;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    const projected = projectProduct({
      ...options,
      product: {
        name: "Equivalente",
        rateType: "cdi",
        ratePercent: middle,
        taxTreatment: options.taxTreatment,
      },
    });
    if (projected.netFinalAmount < options.targetNetFinalAmount) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function calculateFixedIncomeComparison(
  input: FixedIncomeComparisonInput,
): FixedIncomeComparisonResult {
  const numericValues = [
    input.initialAmount,
    input.termDays,
    input.cdiAnnualPercent,
    ...input.products.map((product) => product.ratePercent),
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) {
    return { status: "invalid", message: "Informe somente valores numéricos válidos." };
  }
  if (input.initialAmount <= 0) {
    return { status: "invalid", message: "O valor investido deve ser maior que zero." };
  }
  if (!Number.isInteger(input.termDays) || input.termDays < 30) {
    return {
      status: "invalid",
      message: "Informe um prazo inteiro de pelo menos 30 dias.",
    };
  }
  if (
    input.cdiAnnualPercent < 0 ||
    input.products.some((product) => product.ratePercent < 0)
  ) {
    return { status: "invalid", message: "Taxas não podem ser negativas." };
  }

  const projected = input.products.map((product) =>
    projectProduct({
      initialAmount: input.initialAmount,
      termDays: input.termDays,
      cdiAnnualPercent: input.cdiAnnualPercent,
      product,
    }),
  ) as [
    Omit<FixedIncomeProductResult, "equivalentOppositeTaxCdiPercent">,
    Omit<FixedIncomeProductResult, "equivalentOppositeTaxCdiPercent">,
  ];
  const products = projected.map((product) => ({
    ...product,
    equivalentOppositeTaxCdiPercent: findEquivalentCdiPercentage({
      targetNetFinalAmount: product.netFinalAmount,
      initialAmount: input.initialAmount,
      termDays: input.termDays,
      cdiAnnualPercent: input.cdiAnnualPercent,
      taxTreatment: product.taxTreatment === "regressive" ? "exempt" : "regressive",
    }),
  })) as [FixedIncomeProductResult, FixedIncomeProductResult];
  const difference = Math.abs(products[0].netFinalAmount - products[1].netFinalAmount);
  const winner =
    difference < 0.005
      ? null
      : products[0].netFinalAmount > products[1].netFinalAmount
        ? 0
        : 1;
  return { status: "valid", products, winner, difference };
}
