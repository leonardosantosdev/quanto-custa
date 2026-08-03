import { describe, expect, it } from "vitest";

import { calculateFinancialIndependence } from "@/lib/financial-independence";

const baseInput = {
  currentAge: 30,
  targetAge: 60,
  currentAssets: 0,
  monthlyContribution: 1_000,
  desiredMonthlyIncome: 5_000,
  nominalAnnualReturnPercent: 8,
  annualInflationPercent: 4,
  annualWithdrawalRatePercent: 4,
};

describe("independência financeira", () => {
  it("calcula o patrimônio necessário pela renda e taxa de retirada", () => {
    const result = calculateFinancialIndependence(baseInput);
    expect(result.status).toBe("valid");
    if (result.status === "valid") expect(result.targetAssets).toBe(1_500_000);
  });

  it("desconta a inflação pela relação entre taxas", () => {
    const result = calculateFinancialIndependence(baseInput);
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.realAnnualReturnPercent).toBeCloseTo(3.8461538, 6);
    }
  });

  it("projeta patrimônio e encontra aporte necessário coerente", () => {
    const result = calculateFinancialIndependence(baseInput);
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.monthsToTargetAge).toBe(360);
      expect(result.projectedAssetsAtTargetAge).toBeGreaterThan(360_000);
      expect(result.requiredMonthlyContribution).toBeGreaterThan(1_000);
      const withRequiredContribution = calculateFinancialIndependence({
        ...baseInput,
        monthlyContribution: result.requiredMonthlyContribution,
      });
      expect(withRequiredContribution.status).toBe("valid");
      if (withRequiredContribution.status === "valid") {
        expect(withRequiredContribution.projectedAssetsAtTargetAge).toBeCloseTo(
          result.targetAssets,
          5,
        );
      }
    }
  });

  it("funciona quando o retorno real é zero", () => {
    const result = calculateFinancialIndependence({
      ...baseInput,
      nominalAnnualReturnPercent: 4,
      annualInflationPercent: 4,
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.projectedAssetsAtTargetAge).toBe(360_000);
      expect(result.requiredMonthlyContribution).toBeCloseTo(1_500_000 / 360, 8);
    }
  });

  it("identifica uma meta já alcançada", () => {
    const result = calculateFinancialIndependence({
      ...baseInput,
      currentAssets: 1_500_000,
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.monthsUntilGoal).toBe(0);
      expect(result.goalAge).toBe(30);
      expect(result.requiredMonthlyContribution).toBe(0);
    }
  });

  it("rejeita idades e taxa de retirada inválidas", () => {
    expect(calculateFinancialIndependence({ ...baseInput, targetAge: 30 }).status).toBe(
      "invalid",
    );
    expect(
      calculateFinancialIndependence({ ...baseInput, annualWithdrawalRatePercent: 0 })
        .status,
    ).toBe("invalid");
  });
});
