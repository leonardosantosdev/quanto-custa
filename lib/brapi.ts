import "server-only";

import { BRAPI_BASE_URL, CACHE_TIMES } from "@/lib/config";

export interface StockQuote {
  name: string;
  price: number;
  updatedAt: string;
}

export interface BrapiStockSearchResult {
  ticker: string;
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseQuoteResponse(value: unknown): StockQuote | null {
  if (!isRecord(value) || !Array.isArray(value.results)) return null;
  const first = value.results[0];
  if (!isRecord(first) || !isRecord(first.data)) return null;
  const data = first.data;

  return typeof data.regularMarketPrice === "number" &&
    Number.isFinite(data.regularMarketPrice) &&
    typeof data.regularMarketTime === "string" &&
    data.currency === "BRL"
    ? {
        name:
          (typeof data.longName === "string" && data.longName.trim()) ||
          (typeof data.shortName === "string" && data.shortName.trim()) ||
          (typeof first.symbol === "string" && first.symbol) ||
          "Ação da B3",
        price: data.regularMarketPrice,
        updatedAt: data.regularMarketTime,
      }
    : null;
}

function parseSearchResponse(value: unknown): BrapiStockSearchResult[] {
  if (!isRecord(value) || !Array.isArray(value.results)) return [];

  return value.results.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.symbol !== "string" ||
      typeof item.name !== "string" ||
      item.subType !== "stock" ||
      item.isActive === false
    ) {
      return [];
    }

    return [{ ticker: item.symbol.toUpperCase(), name: item.name.trim() }];
  });
}

export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  const token = process.env.BRAPI_TOKEN?.trim();
  if (!token) return null;

  const response = await fetch(
    `${BRAPI_BASE_URL}/stocks/quote?symbols=${encodeURIComponent(ticker)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: CACHE_TIMES.quote },
    },
  );
  if (!response.ok) throw new Error(`brapi respondeu com status ${response.status}`);
  return parseQuoteResponse((await response.json()) as unknown);
}

export async function searchBrapiStocks(
  query: string,
): Promise<BrapiStockSearchResult[]> {
  const token = process.env.BRAPI_TOKEN?.trim();
  if (!token) return [];

  const parameters = new URLSearchParams({
    search: query,
    subType: "stock",
    limit: "8",
  });
  const response = await fetch(`${BRAPI_BASE_URL}/tickers?${parameters}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: CACHE_TIMES.tickerSearch },
  });
  if (!response.ok) return [];
  return parseSearchResponse((await response.json()) as unknown);
}
