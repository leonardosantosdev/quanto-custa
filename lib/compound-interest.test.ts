import { describe, expect, it } from "vitest";

import { calculateCompoundInterest } from "@/lib/compound-interest";

describe("cálculo de juros compostos", () => {
  it("capitaliza o aporte inicial mensalmente", () => {
    const result = calculateCompoundInterest({
      initialAmount: 1_000,
      monthlyContribution: 0,
      interestRatePercent: 1,
      interestRatePeriod: "monthly",
      term: 12,
      termUnit: "months",
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.finalAmount).toBeCloseTo(1_126.825, 3);
      expect(result.totalInterest).toBeCloseTo(126.825, 3);
    }
  });

  it("considera aportes no fim de cada mês", () => {
    const result = calculateCompoundInterest({
      initialAmount: 0,
      monthlyContribution: 100,
      interestRatePercent: 1,
      interestRatePeriod: "monthly",
      term: 2,
      termUnit: "months",
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.finalAmount).toBeCloseTo(201, 8);
      expect(result.totalInvested).toBe(200);
      expect(result.totalInterest).toBeCloseTo(1, 8);
      expect(result.months).toBe(2);
    }
  });

  it("converte uma taxa anual efetiva em taxa mensal equivalente", () => {
    const result = calculateCompoundInterest({
      initialAmount: 1_000,
      monthlyContribution: 0,
      interestRatePercent: 12,
      interestRatePeriod: "annual",
      term: 1,
      termUnit: "years",
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.finalAmount).toBeCloseTo(1_120, 8);
    }
  });

  it("trata taxa zero sem divisão por zero", () => {
    const result = calculateCompoundInterest({
      initialAmount: 500,
      monthlyContribution: 100,
      interestRatePercent: 0,
      interestRatePeriod: "monthly",
      term: 1,
      termUnit: "years",
    });
    expect(result).toMatchObject({
      status: "valid",
      finalAmount: 1_700,
      totalInvested: 1_700,
      totalInterest: 0,
    });
  });

  it("rejeita prazo fracionário ou valores negativos", () => {
    expect(
      calculateCompoundInterest({
        initialAmount: -1,
        monthlyContribution: 0,
        interestRatePercent: 1,
        interestRatePeriod: "monthly",
        term: 12,
        termUnit: "months",
      }).status,
    ).toBe("invalid");
    expect(
      calculateCompoundInterest({
        initialAmount: 1,
        monthlyContribution: 0,
        interestRatePercent: 1,
        interestRatePeriod: "monthly",
        term: 1.5,
        termUnit: "months",
      }).status,
    ).toBe("invalid");
  });
});
