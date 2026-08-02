import "server-only";

import {
  findDemoStock,
  isDemoDataEnabled,
  searchDemoStocks,
} from "@/data/demo/stocks";
import { getStockQuote, searchBrapiStocks } from "@/lib/brapi";
import { hasDatabaseConfiguration } from "@/lib/db/client";
import {
  findActiveCompanies,
  getActiveCompany,
  getStockFundamentals,
} from "@/lib/db/fundamentals";
import {
  looksLikeUnsupportedListedAsset,
  normalizeTicker,
} from "@/lib/ticker";
import type {
  CalculationMethod,
  SearchResponse,
  StockLookupResult,
} from "@/lib/types";

function assetClassLabel(shareClass: "ON" | "PN"): string {
  return shareClass === "ON" ? "Ação ordinária" : "Ação preferencial";
}

function inferredAssetClass(ticker: string): string {
  if (ticker.endsWith("3")) return "Ação ordinária";
  if (/[4-8]$/.test(ticker)) return "Ação preferencial";
  return "Ação da B3";
}

function demoSearch(query: string): SearchResponse {
  return {
    results: searchDemoStocks(query).map((stock) => ({
      ticker: stock.ticker,
      name: stock.name,
      assetClass: stock.assetClass,
      supported: true,
      calculationMode: "automatic",
    })),
    demo: true,
  };
}

export async function searchStocks(
  query: string,
  method: CalculationMethod = "graham",
): Promise<SearchResponse> {
  const normalizedQuery = query.trim().slice(0, 60);
  if (normalizedQuery.length < 2) {
    return { results: [], demo: !hasDatabaseConfiguration() && isDemoDataEnabled() };
  }

  try {
    const companies = hasDatabaseConfiguration()
      ? await findActiveCompanies(normalizedQuery)
      : [];
    const externalStocks = await searchBrapiStocks(normalizedQuery).catch(() => []);
    const results = companies.map((company) => ({
      ticker: company.ticker,
      name: company.company_name,
      assetClass: assetClassLabel(company.share_class),
      supported: true,
      calculationMode: (method === "bazin"
        ? company.dividends_available
        : company.fundamentals_available)
        ? ("automatic" as const)
        : ("manual" as const),
    }));
    const knownTickers = new Set(results.map((result) => result.ticker));

    for (const stock of externalStocks) {
      const ticker = normalizeTicker(stock.ticker);
      if (
        !ticker ||
        knownTickers.has(ticker) ||
        looksLikeUnsupportedListedAsset(ticker)
      ) {
        continue;
      }
      results.push({
        ticker,
        name: stock.name,
        assetClass: inferredAssetClass(ticker),
        supported: true,
        calculationMode: "manual",
      });
      knownTickers.add(ticker);
    }

    if (results.length === 0 && isDemoDataEnabled()) {
      return demoSearch(normalizedQuery);
    }

    return {
      results: results.slice(0, 8),
      demo: false,
      message:
        results.length === 0 && !process.env.BRAPI_TOKEN?.trim()
          ? "Configure a BRAPI_TOKEN para pesquisar todo o catálogo da B3."
          : undefined,
    };
  } catch {
    if (isDemoDataEnabled()) {
      return {
        ...demoSearch(normalizedQuery),
        message: "Banco indisponível. Exibindo dados de demonstração.",
      };
    }
    return {
      results: [],
      demo: false,
      message: "A busca está temporariamente indisponível. Tente novamente.",
    };
  }
}

function demoLookup(ticker: string): StockLookupResult | null {
  if (!isDemoDataEnabled()) return null;
  const demo = findDemoStock(ticker);
  return demo ? { status: "success", stock: demo } : null;
}

export async function getStock(value: string): Promise<StockLookupResult> {
  const ticker = normalizeTicker(value);
  if (!ticker) {
    return {
      status: "not-found",
      message: "O ticker informado não tem um formato válido para ações da B3.",
    };
  }

  if (looksLikeUnsupportedListedAsset(ticker)) {
    return {
      status: "unsupported",
      message:
        "O Número de Graham foi pensado para ações de empresas. Esta categoria de ativo ainda não é suportada.",
    };
  }

  try {
    const fundamentals = hasDatabaseConfiguration()
      ? await getStockFundamentals(ticker)
      : null;
    if (!fundamentals) {
      const demo = demoLookup(ticker);
      if (demo) return demo;
      const [company, quote] = await Promise.all([
        hasDatabaseConfiguration() ? getActiveCompany(ticker) : null,
        getStockQuote(ticker),
      ]);
      if (!quote) {
        return {
          status: "not-found",
          message: "Não encontramos uma cotação disponível para esse ticker.",
        };
      }

      return {
        status: "manual",
        stock: {
          ticker,
          name: company?.company_name ?? quote.name,
          assetClass: company
            ? assetClassLabel(company.share_class)
            : inferredAssetClass(ticker),
          price: quote.price,
          updatedAt: quote.updatedAt,
        },
        message:
          "A cotação foi encontrada, mas ainda não temos LPA e VPA seguros para esta ação.",
      };
    }

    const quote = await getStockQuote(ticker);
    if (!quote) {
      return {
        status: "error",
        message: "A cotação atual não está disponível neste ambiente.",
      };
    }

    return {
      status: "success",
      stock: {
        ticker,
        name: fundamentals.companyName,
        assetClass: assetClassLabel(fundamentals.shareClass),
        price: quote.price,
        eps: fundamentals.eps,
        bookValuePerShare: fundamentals.bookValuePerShare,
        updatedAt: quote.updatedAt,
        referenceDate: fundamentals.referenceDate,
        fundamentalsUpdatedAt: fundamentals.updatedAt,
        documentReceivedAt: fundamentals.documentReceivedAt,
        documentType: fundamentals.documentType,
        documentVersion: fundamentals.documentVersion,
        source: "cvm",
      },
    };
  } catch {
    return (
      demoLookup(ticker) ?? {
        status: "error",
        message: "Não foi possível consultar os dados agora. Tente novamente.",
      }
    );
  }
}

export { normalizeTicker } from "@/lib/ticker";
