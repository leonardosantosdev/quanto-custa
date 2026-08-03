import { describe, expect, it } from "vitest";

import {
  calculateBazinPriceCeiling,
  DEFAULT_BAZIN_YIELD_PERCENT,
  jcpNetFactor,
} from "@/lib/bazin";

describe("cálculo de Bazin", () => {
  it("calcula o preço-teto com retorno padrão de 6%", () => {
    expect(calculateBazinPriceCeiling({ annualProceedsPerShare: 1.5 })).toEqual({
      status: "valid",
      value: 25,
      annualProceedsPerShare: 1.5,
      minimumYieldPercent: DEFAULT_BAZIN_YIELD_PERCENT,
    });
  });

  it("aceita retorno mínimo personalizado", () => {
    const result = calculateBazinPriceCeiling({
      annualProceedsPerShare: 2,
      minimumYieldPercent: 8,
    });
    expect(result.status).toBe("valid");
    if (result.status === "valid") expect(result.value).toBe(25);
  });

  it("recusa proventos e retorno inválidos", () => {
    expect(calculateBazinPriceCeiling({ annualProceedsPerShare: 0 }).status).toBe(
      "invalid",
    );
    expect(
      calculateBazinPriceCeiling({
        annualProceedsPerShare: 1,
        minimumYieldPercent: 0,
      }).status,
    ).toBe("invalid");
  });

  it("aplica a retenção de JCP correspondente ao ano de referência", () => {
    expect(2 * jcpNetFactor("2025-12-31")).toBeCloseTo(1.7);
    expect(2 * jcpNetFactor("2026-01-01")).toBeCloseTo(1.65);
  });
});
