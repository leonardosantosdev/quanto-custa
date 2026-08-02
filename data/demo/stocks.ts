import type { StockSnapshot } from "@/lib/types";

const DEMO_UPDATED_AT = "2026-01-15T18:00:00.000Z";
const DEMO_REFERENCE_DATE = "2025-09-30";

export const DEMO_STOCKS: readonly StockSnapshot[] = [
  {
    ticker: "BBAS3",
    name: "Banco do Brasil",
    assetClass: "Ação ordinária",
    price: 27.84,
    eps: 7.2,
    bookValuePerShare: 32.5,
    updatedAt: DEMO_UPDATED_AT,
    referenceDate: DEMO_REFERENCE_DATE,
    fundamentalsUpdatedAt: DEMO_UPDATED_AT,
    documentReceivedAt: null,
    documentType: null,
    documentVersion: null,
    source: "demo",
  },
  {
    ticker: "PETR4",
    name: "Petrobras",
    assetClass: "Ação preferencial",
    price: 36.18,
    eps: 8.41,
    bookValuePerShare: 31.72,
    updatedAt: DEMO_UPDATED_AT,
    referenceDate: DEMO_REFERENCE_DATE,
    fundamentalsUpdatedAt: DEMO_UPDATED_AT,
    documentReceivedAt: null,
    documentType: null,
    documentVersion: null,
    source: "demo",
  },
  {
    ticker: "ITSA4",
    name: "Itaúsa",
    assetClass: "Ação preferencial",
    price: 10.43,
    eps: 1.48,
    bookValuePerShare: 8.37,
    updatedAt: DEMO_UPDATED_AT,
    referenceDate: DEMO_REFERENCE_DATE,
    fundamentalsUpdatedAt: DEMO_UPDATED_AT,
    documentReceivedAt: null,
    documentType: null,
    documentVersion: null,
    source: "demo",
  },
  {
    ticker: "WEGE3",
    name: "WEG",
    assetClass: "Ação ordinária",
    price: 52.16,
    eps: 1.31,
    bookValuePerShare: 3.92,
    updatedAt: DEMO_UPDATED_AT,
    referenceDate: DEMO_REFERENCE_DATE,
    fundamentalsUpdatedAt: DEMO_UPDATED_AT,
    documentReceivedAt: null,
    documentType: null,
    documentVersion: null,
    source: "demo",
  },
] as const;

function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function findDemoStock(ticker: string): StockSnapshot | undefined {
  return DEMO_STOCKS.find((stock) => stock.ticker === ticker);
}

export function searchDemoStocks(query: string): StockSnapshot[] {
  const normalizedQuery = foldText(query.trim());
  if (!normalizedQuery) return [];
  return DEMO_STOCKS.filter((stock) =>
    foldText(`${stock.ticker} ${stock.name}`).includes(normalizedQuery),
  );
}

export function isDemoDataEnabled(): boolean {
  return process.env.ENABLE_DEMO_DATA === "true";
}
