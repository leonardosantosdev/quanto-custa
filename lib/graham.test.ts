import { describe, expect, it } from "vitest";

import {
  calculateGrahamNumber,
  calculatePriceDifference,
} from "@/lib/graham";
import { formatComparisonSentence } from "@/lib/formatters";

describe("calculateGrahamNumber", () => {
  it("calcula um Número de Graham válido", () => {
    const result = calculateGrahamNumber({ eps: 7.2, bookValuePerShare: 32.5 });
    expect(result.status).toBe("valid");
    if (result.status === "valid") expect(result.value).toBeCloseTo(72.56, 2);
  });

  it("não calcula com LPA negativo", () => {
    expect(calculateGrahamNumber({ eps: -1, bookValuePerShare: 10 })).toMatchObject({
      status: "invalid",
      reason: "non-positive-eps",
    });
  });

  it("não calcula com VPA negativo", () => {
    expect(calculateGrahamNumber({ eps: 2, bookValuePerShare: -10 })).toMatchObject({
      status: "invalid",
      reason: "non-positive-book-value",
    });
  });

  it("não calcula com valor zero", () => {
    expect(calculateGrahamNumber({ eps: 0, bookValuePerShare: 10 }).status).toBe(
      "invalid",
    );
    expect(calculateGrahamNumber({ eps: 2, bookValuePerShare: 0 }).status).toBe(
      "invalid",
    );
  });

  it("não calcula com valor ausente", () => {
    expect(calculateGrahamNumber({ bookValuePerShare: 10 })).toMatchObject({
      status: "invalid",
      reason: "missing-eps",
    });
    expect(calculateGrahamNumber({ eps: 2 })).toMatchObject({
      status: "invalid",
      reason: "missing-book-value",
    });
  });
});

describe("calculatePriceDifference", () => {
  it("identifica cotação abaixo do Número de Graham", () => {
    expect(calculatePriceDifference({ price: 80, grahamNumber: 100 })).toEqual({
      status: "valid",
      percentage: -20,
      position: "below",
    });
  });

  it("identifica cotação acima do Número de Graham", () => {
    expect(calculatePriceDifference({ price: 120, grahamNumber: 100 })).toEqual({
      status: "valid",
      percentage: 20,
      position: "above",
    });
  });
});

describe("formatComparisonSentence", () => {
  it("formata o texto final em português", () => {
    const comparison = calculatePriceDifference({ price: 80, grahamNumber: 100 });
    expect(formatComparisonSentence("TEST3", 80, 100, comparison)).toBe(
      "O Número de Graham de TEST3 é R$ 100,00. A cotação considerada foi R$ 80,00. Com esses dados, a cotação está 20,0% abaixo do resultado da fórmula.",
    );
  });
});
