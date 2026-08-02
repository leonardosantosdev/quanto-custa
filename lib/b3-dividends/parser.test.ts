import { describe, expect, it } from "vitest";

import { parseB3DividendSnapshot } from "@/lib/b3-dividends/parser";
import type { B3CompanySupplement } from "@/lib/b3-dividends/types";

const snapshot: B3CompanySupplement = {
  cashDividends: [
    {
      approvedOn: "11/05/2026",
      paymentDate: "20/08/2026",
      rate: "0,35048636000",
      relatedTo: "Anual/2026",
      isinCode: "BRPETRACNOR9",
      label: "JRS CAP PROPRIO",
      lastDatePrior: "01/06/2026",
      remarks: "",
    },
    {
      approvedOn: "11/05/2026",
      paymentDate: "21/09/2026",
      rate: "0,35048636000",
      relatedTo: "Anual/2026",
      isinCode: "BRPETRACNOR9",
      label: "JRS CAP PROPRIO",
      lastDatePrior: "01/06/2026",
      remarks: "",
    },
    {
      approvedOn: "07/08/2025",
      paymentDate: "22/12/2025",
      rate: "0,20092175000",
      relatedTo: "Anual/2025",
      isinCode: "BRPETRACNPR6",
      label: "DIVIDENDO",
      lastDatePrior: "21/08/2025",
      remarks: "",
    },
    {
      approvedOn: "16/04/2026",
      paymentDate: "20/05/2026",
      rate: "0,01649003000",
      isinCode: "BRPETRACNOR9",
      label: "RENDIMENTO",
      lastDatePrior: "22/04/2026",
    },
  ],
  stockDividends: [],
};

describe("proventos oficiais da B3", () => {
  it("mapeia ISIN para a classe correta e preserva parcelas distintas", () => {
    const parsed = parseB3DividendSnapshot({
      snapshot,
      targets: [
        { ticker: "PETR3", shareClassDetail: "ON" },
        { ticker: "PETR4", shareClassDetail: "PN" },
      ],
      now: new Date("2026-08-02T12:00:00.000Z"),
    });

    expect(parsed.candidates).toHaveLength(3);
    expect(parsed.candidates.filter((event) => event.ticker === "PETR3")).toHaveLength(2);
    expect(parsed.candidates.filter((event) => event.ticker === "PETR4")).toHaveLength(1);
    expect(new Set(parsed.candidates.map((event) => event.eventKey)).size).toBe(3);
    const jcp = parsed.candidates.find((event) => event.proceedsType === "jcp");
    expect(jcp?.netValuePerShare).toBeCloseTo(0.35048636 * 0.85);
  });

  it("ajusta proventos anteriores a bonificação ou desdobramento", () => {
    const parsed = parseB3DividendSnapshot({
      snapshot: {
        cashDividends: [
          {
            approvedOn: "01/01/2026",
            paymentDate: "10/01/2026",
            rate: "1,00",
            isinCode: "BRTESTACNOR0",
            label: "DIVIDENDO",
            lastDatePrior: "05/01/2026",
          },
        ],
        stockDividends: [
          {
            factor: "100,00",
            isinCode: "BRTESTACNOR0",
            label: "DESDOBRAMENTO",
            lastDatePrior: "01/03/2026",
          },
        ],
      },
      targets: [{ ticker: "TEST3", shareClassDetail: "ON" }],
      now: new Date("2026-08-02T12:00:00.000Z"),
    });

    expect(parsed.candidates[0].adjustmentFactor).toBe(2);
    expect(parsed.candidates[0].grossValuePerShare).toBeCloseTo(0.5);
  });
});
