import "server-only";

import { getStockQuote } from "@/lib/brapi";
import { hasDatabaseConfiguration } from "@/lib/db/client";
import { getAnnualProceeds } from "@/lib/db/dividends";
import { getActiveCompany } from "@/lib/db/fundamentals";
import {
  looksLikeUnsupportedListedAsset,
  normalizeTicker,
} from "@/lib/ticker";
import type { BazinStockLookupResult } from "@/lib/types";

function assetClassLabel(shareClass: "ON" | "PN"): string {
  return shareClass === "ON" ? "Ação ordinária" : "Ação preferencial";
}

function inferredAssetClass(ticker: string): string {
  if (ticker.endsWith("3")) return "Ação ordinária";
  if (/[4-8]$/.test(ticker)) return "Ação preferencial";
  return "Ação da B3";
}

export async function getBazinStock(value: string): Promise<BazinStockLookupResult> {
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
      message: "O cálculo automático de Bazin está disponível para ações de empresas.",
    };
  }

  try {
    const [proceeds, company, quote] = await Promise.all([
      hasDatabaseConfiguration() ? getAnnualProceeds(ticker) : null,
      hasDatabaseConfiguration() ? getActiveCompany(ticker) : null,
      getStockQuote(ticker),
    ]);
    if (!quote) {
      return {
        status: "not-found",
        message: "Não encontramos uma cotação disponível para esse ticker.",
      };
    }
    if (!proceeds) {
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
          "A cotação foi encontrada, mas ainda não temos proventos seguros dos últimos 12 meses para esta ação.",
      };
    }

    return {
      status: "success",
      stock: {
        ticker,
        name: proceeds.companyName,
        assetClass: assetClassLabel(proceeds.shareClass),
        price: quote.price,
        updatedAt: quote.updatedAt,
        dividendsPerShare: proceeds.dividendsPerShare,
        jcpGrossPerShare: proceeds.jcpGrossPerShare,
        jcpNetPerShare: proceeds.jcpNetPerShare,
        netProceedsPerShare: proceeds.netProceedsPerShare,
        eventCount: proceeds.eventCount,
        periodStart: proceeds.periodStart,
        periodEnd: proceeds.periodEnd,
        proceedsUpdatedAt: proceeds.updatedAt,
        source: "b3",
      },
    };
  } catch {
    return {
      status: "error",
      message: "Não foi possível consultar os dados de Bazin agora. Tente novamente.",
    };
  }
}
