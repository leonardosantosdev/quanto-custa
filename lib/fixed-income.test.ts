import { describe, expect, it } from "vitest";

import {
  calculateFixedIncomeComparison,
  cdiPercentageToAnnualRate,
  incomeTaxRate,
} from "@/lib/fixed-income";

describe("comparação de renda fixa", () => {
  it("aplica a tabela regressiva nos limites de prazo", () => {
    expect(incomeTaxRate(180)).toBe(0.225);
    expect(incomeTaxRate(181)).toBe(0.2);
    expect(incomeTaxRate(360)).toBe(0.2);
    expect(incomeTaxRate(361)).toBe(0.175);
    expect(incomeTaxRate(720)).toBe(0.175);
    expect(incomeTaxRate(721)).toBe(0.15);
  });

  it("converte percentual do CDI pela taxa diária em base 252", () => {
    expect(cdiPercentageToAnnualRate(10, 100)).toBeCloseTo(0.1, 10);
    expect(cdiPercentageToAnnualRate(10, 110)).toBeGreaterThan(0.11);
  });

  it("cobra imposto apenas sobre o rendimento do produto tributável", () => {
    const result = calculateFixedIncomeComparison({
      initialAmount: 10_000,
      termDays: 365,
      cdiAnnualPercent: 10,
      products: [
        { name: "CDB", taxTreatment: "regressive", rateType: "cdi", ratePercent: 100 },
        { name: "LCI", taxTreatment: "exempt", rateType: "cdi", ratePercent: 100 },
      ],
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.products[0].grossEarnings).toBeCloseTo(1_000, 6);
      expect(result.products[0].incomeTaxAmount).toBeCloseTo(175, 6);
      expect(result.products[0].netFinalAmount).toBeCloseTo(10_825, 6);
      expect(result.products[1].incomeTaxAmount).toBe(0);
      expect(result.products[1].netFinalAmount).toBeCloseTo(11_000, 6);
      expect(result.winner).toBe(1);
    }
  });

  it("calcula a taxa equivalente no tratamento tributário oposto", () => {
    const result = calculateFixedIncomeComparison({
      initialAmount: 10_000,
      termDays: 365,
      cdiAnnualPercent: 10,
      products: [
        { name: "CDB", taxTreatment: "regressive", rateType: "cdi", ratePercent: 110 },
        { name: "LCI", taxTreatment: "exempt", rateType: "cdi", ratePercent: 90 },
      ],
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.products[0].equivalentOppositeTaxCdiPercent).toBeLessThan(110);
      expect(result.products[1].equivalentOppositeTaxCdiPercent).toBeGreaterThan(90);
    }
  });

  it("rejeita prazo sujeito a IOF e valores inválidos", () => {
    const result = calculateFixedIncomeComparison({
      initialAmount: 0,
      termDays: 29,
      cdiAnnualPercent: 10,
      products: [
        { name: "A", taxTreatment: "regressive", rateType: "cdi", ratePercent: 100 },
        { name: "B", taxTreatment: "exempt", rateType: "fixed", ratePercent: 10 },
      ],
    });
    expect(result.status).toBe("invalid");
  });
});
