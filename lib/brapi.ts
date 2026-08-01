import "server-only";

import { BRAPI_BASE_URL, CACHE_TIMES } from "@/lib/config";
import { findDemoStock, searchDemoStocks } from "@/lib/demo-data";
import type {
  SearchResponse,
  StockLookupResult,
  StockSearchResult,
} from "@/lib/types";

interface BrapiTicker {
  symbol: string;
  name: string;
  longName: string | null;
  assetType: string;
  subType: string;
  exchange: string;
}

interface BrapiQuote {
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketTime: string;
}

interface BrapiStatistics {
  bookValue: number | null;
  earningsPerShare: number | null;
  mostRecentQuarter: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function parseTicker(value: unknown): BrapiTicker | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.symbol) ||
    !isString(value.name) ||
    !isNullableString(value.longName) ||
    !isString(value.assetType) ||
    !isString(value.subType) ||
    !isString(value.exchange)
  ) {
    return null;
  }

  return {
    symbol: value.symbol,
    name: value.name,
    longName: value.longName,
    assetType: value.assetType,
    subType: value.subType,
    exchange: value.exchange,
  };
}

function parseTickerResponse(value: unknown): BrapiTicker[] {
  if (!isRecord(value) || !Array.isArray(value.results)) return [];
  return value.results.map(parseTicker).filter((item) => item !== null);
}

function parseQuoteResponse(value: unknown): BrapiQuote | null {
  if (!isRecord(value) || !Array.isArray(value.results)) return null;
  const first = value.results[0];
  if (!isRecord(first) || !isRecord(first.data)) return null;
  const data = first.data;

  if (
    !isString(data.shortName) ||
    !isString(data.longName) ||
    !isString(data.currency) ||
    !isNumber(data.regularMarketPrice) ||
    !isString(data.regularMarketTime)
  ) {
    return null;
  }

  return {
    shortName: data.shortName,
    longName: data.longName,
    currency: data.currency,
    regularMarketPrice: data.regularMarketPrice,
    regularMarketTime: data.regularMarketTime,
  };
}

function parseStatisticsResponse(value: unknown): BrapiStatistics | null {
  if (!isRecord(value) || !Array.isArray(value.results)) return null;
  const first = value.results[0];
  if (!isRecord(first) || !isRecord(first.data)) return null;
  const data = first.data;

  if (
    !isNullableNumber(data.bookValue) ||
    !isNullableNumber(data.earningsPerShare) ||
    !isNullableString(data.mostRecentQuarter)
  ) {
    return null;
  }

  return {
    bookValue: data.bookValue,
    earningsPerShare: data.earningsPerShare,
    mostRecentQuarter: data.mostRecentQuarter,
  };
}

function authorizationHeaders(): HeadersInit {
  const token = process.env.BRAPI_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson(url: string, revalidate: number): Promise<unknown> {
  const response = await fetch(url, {
    headers: authorizationHeaders(),
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`brapi respondeu com status ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

function isSupportedStock(ticker: BrapiTicker): boolean {
  return (
    ticker.exchange === "B3" &&
    ticker.assetType === "stock" &&
    ticker.subType === "stock"
  );
}

function assetClassLabel(ticker: BrapiTicker): string {
  if (!isSupportedStock(ticker)) {
    const labels: Record<string, string> = {
      fii: "Fundo imobiliário",
      etf: "ETF",
      bdr: "BDR",
      unit: "Unit",
      fund: "Fundo",
    };
    return labels[ticker.subType] ?? "Ativo não suportado";
  }

  if (ticker.symbol.endsWith("3")) return "Ação ordinária";
  if (ticker.symbol.endsWith("4")) return "Ação preferencial";
  return "Ação brasileira";
}

export function normalizeTicker(value: string): string | null {
  const ticker = value.trim().toUpperCase();
  return /^[A-Z]{4}[0-9]{1,2}$/.test(ticker) ? ticker : null;
}

function looksLikeUnsupportedListedAsset(ticker: string): boolean {
  return /(?:11|3[4-9])$/.test(ticker);
}

export async function searchStocks(query: string): Promise<SearchResponse> {
  const normalizedQuery = query.trim().slice(0, 60);

  if (normalizedQuery.length < 2) {
    return { results: [], demo: !process.env.BRAPI_TOKEN };
  }

  if (!process.env.BRAPI_TOKEN) {
    return {
      results: searchDemoStocks(normalizedQuery).map((stock) => ({
        ticker: stock.ticker,
        name: stock.name,
        assetClass: stock.assetClass,
        supported: true,
      })),
      demo: true,
    };
  }

  try {
    const url = `${BRAPI_BASE_URL}/tickers?search=${encodeURIComponent(normalizedQuery)}&limit=8`;
    const response = await fetchJson(url, CACHE_TIMES.tickerSearch);
    const results: StockSearchResult[] = parseTickerResponse(response).map(
      (ticker) => ({
        ticker: ticker.symbol,
        name: ticker.name,
        assetClass: assetClassLabel(ticker),
        supported: isSupportedStock(ticker),
      }),
    );

    return { results, demo: false };
  } catch {
    if (process.env.NODE_ENV === "development") {
      return {
        results: searchDemoStocks(normalizedQuery).map((stock) => ({
          ticker: stock.ticker,
          name: stock.name,
          assetClass: stock.assetClass,
          supported: true,
        })),
        demo: true,
        message:
          "A API não respondeu. Exibindo resultados simulados para desenvolvimento.",
      };
    }

    return {
      results: [],
      demo: false,
      message: "A busca está temporariamente indisponível. Tente novamente.",
    };
  }
}

async function getRemoteStock(ticker: string): Promise<StockLookupResult> {
  const catalogUrl = `${BRAPI_BASE_URL}/tickers?search=${encodeURIComponent(ticker)}&limit=10`;
  const catalogResponse = await fetchJson(
    catalogUrl,
    CACHE_TIMES.tickerSearch,
  );
  const catalogItem = parseTickerResponse(catalogResponse).find(
    (item) => item.symbol === ticker,
  );

  if (!catalogItem) {
    return {
      status: "not-found",
      message: "Não encontramos esse ticker entre os ativos da B3.",
    };
  }

  if (!isSupportedStock(catalogItem)) {
    return {
      status: "unsupported",
      message:
        "O Número de Graham foi pensado para ações de empresas. Esta categoria de ativo ainda não é suportada.",
    };
  }

  const quoteUrl = `${BRAPI_BASE_URL}/stocks/quote?symbols=${encodeURIComponent(ticker)}`;
  const statisticsUrl = `${BRAPI_BASE_URL}/stocks/statistics?symbols=${encodeURIComponent(ticker)}&mode=current`;
  const [quoteResponse, statisticsResponse] = await Promise.all([
    fetchJson(quoteUrl, CACHE_TIMES.quote),
    fetchJson(statisticsUrl, CACHE_TIMES.fundamentals),
  ]);
  const quote = parseQuoteResponse(quoteResponse);
  const statistics = parseStatisticsResponse(statisticsResponse);

  if (!quote || !statistics || quote.currency !== "BRL") {
    return {
      status: "error",
      message:
        "Os dados necessários para esta ação não estão disponíveis no momento.",
    };
  }

  return {
    status: "success",
    stock: {
      ticker,
      name: catalogItem.name || quote.longName,
      assetClass: assetClassLabel(catalogItem),
      price: quote.regularMarketPrice,
      eps: statistics.earningsPerShare,
      bookValuePerShare: statistics.bookValue,
      updatedAt: quote.regularMarketTime,
      referenceDate: statistics.mostRecentQuarter,
      source: "brapi",
    },
  };
}

export async function getStock(value: string): Promise<StockLookupResult> {
  const ticker = normalizeTicker(value);

  if (!ticker) {
    return {
      status: "not-found",
      message: "O ticker informado não tem um formato válido para ações da B3.",
    };
  }

  if (!process.env.BRAPI_TOKEN) {
    const demoStock = findDemoStock(ticker);
    if (demoStock) return { status: "success", stock: demoStock };

    if (looksLikeUnsupportedListedAsset(ticker)) {
      return {
        status: "unsupported",
        message:
          "O Número de Graham foi pensado para ações de empresas. Esta categoria de ativo ainda não é suportada.",
      };
    }

    return {
      status: "not-found",
      message:
        "No modo de demonstração, estão disponíveis BBAS3, PETR4, ITSA4 e WEGE3.",
    };
  }

  try {
    return await getRemoteStock(ticker);
  } catch {
    if (process.env.NODE_ENV === "development") {
      const demoStock = findDemoStock(ticker);
      if (demoStock) {
        return {
          status: "success",
          stock: { ...demoStock, fallbackFromApi: true },
        };
      }
    }

    return {
      status: "error",
      message:
        "Não foi possível consultar a fonte de dados agora. Tente novamente em instantes.",
    };
  }
}
