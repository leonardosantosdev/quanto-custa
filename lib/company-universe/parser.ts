import { parse as parseSync } from "csv-parse/sync";

import {
  normalizeCnpj,
  normalizeCvmCode,
  normalizeText,
  parseCvmDate,
  parseCvmNumber,
} from "@/lib/cvm/normalizers";
import type {
  CompanyUniverseBuildResult,
  DiscoveredCompany,
  B3ListedCompany,
  UniverseWarning,
} from "@/lib/company-universe/types";

type CsvRecord = Record<string, string | undefined>;

export interface FcaSecurity {
  cnpj: string;
  referenceDate: string;
  version: number;
  officialDocumentId: number;
  companyName: string;
  securityType: string;
  preferredClassCode: string;
  ticker: string;
  market: string;
  administrator: string;
  tradingEndDate: string | null;
}

export interface RegistryCompany {
  cnpj: string;
  cvmCode: string;
  companyName: string;
}

function parseCsv(text: string): CsvRecord[] {
  return parseSync(text, {
    columns: true,
    delimiter: ";",
    bom: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  }) as CsvRecord[];
}

export function parseFcaSecuritiesCsv(text: string): FcaSecurity[] {
  return parseCsv(text).flatMap((record) => {
    const cnpj = normalizeCnpj(record.CNPJ_Companhia ?? "");
    const referenceDate = parseCvmDate(record.Data_Referencia);
    const version = parseCvmNumber(record.Versao);
    const officialDocumentId = parseCvmNumber(record.ID_Documento);
    if (!cnpj || !referenceDate || version === null || officialDocumentId === null) {
      return [];
    }

    return [{
      cnpj,
      referenceDate,
      version,
      officialDocumentId,
      companyName: record.Nome_Empresarial?.trim() ?? "",
      securityType: record.Valor_Mobiliario?.trim() ?? "",
      preferredClassCode: record.Sigla_Classe_Acao_Preferencial?.trim() ?? "",
      ticker: record.Codigo_Negociacao?.trim().toUpperCase() ?? "",
      market: record.Mercado?.trim() ?? "",
      administrator: record.Sigla_Entidade_Administradora?.trim() ?? "",
      tradingEndDate: parseCvmDate(record.Data_Fim_Negociacao),
    }];
  });
}

export function parseCvmRegistryCsv(text: string): RegistryCompany[] {
  return parseCsv(text).flatMap((record) => {
    if (normalizeText(record.SIT ?? "") !== "ATIVO") return [];
    const cnpj = normalizeCnpj(record.CNPJ_CIA ?? "");
    const cvmCode = normalizeCvmCode(record.CD_CVM ?? "");
    if (!cnpj || !cvmCode) return [];
    return [{
      cnpj,
      cvmCode,
      companyName: record.DENOM_SOCIAL?.trim() ?? "",
    }];
  });
}

function representationKey(record: FcaSecurity): string {
  return [
    record.referenceDate,
    String(record.version).padStart(8, "0"),
    String(record.officialDocumentId).padStart(16, "0"),
  ].join(":");
}

function shareClassFor(record: FcaSecurity): "ON" | "PN" | null {
  const type = normalizeText(record.securityType);
  if (type !== "ACOES ORDINARIAS" && type !== "ACOES PREFERENCIAIS") return null;
  if (record.ticker.endsWith("3")) return "ON";
  if (/[4-8]$/.test(record.ticker)) return "PN";
  return null;
}

function shareClassDetail(record: FcaSecurity, shareClass: "ON" | "PN"): string {
  if (shareClass === "ON") return "ON";
  return record.preferredClassCode.trim().toUpperCase() || "PN";
}

function canCalculateAutomatically(ticker: string): boolean {
  return /[3-8]$/.test(ticker);
}

export function buildCompanyUniverse(options: {
  fcaSecurities: readonly FcaSecurity[];
  registryCompanies: readonly RegistryCompany[];
  b3Tickers?: ReadonlySet<string>;
  b3ListedCompanies?: readonly B3ListedCompany[];
  today: string;
}): CompanyUniverseBuildResult {
  const warnings: UniverseWarning[] = [];
  const latestByCnpj = new Map<string, string>();
  for (const record of options.fcaSecurities) {
    const key = representationKey(record);
    const current = latestByCnpj.get(record.cnpj);
    if (!current || key > current) latestByCnpj.set(record.cnpj, key);
  }

  const activeCodesByCnpj = new Map<string, Map<string, RegistryCompany>>();
  for (const company of options.registryCompanies) {
    const codes = activeCodesByCnpj.get(company.cnpj) ?? new Map();
    codes.set(company.cvmCode, company);
    activeCodesByCnpj.set(company.cnpj, codes);
  }

  const candidates = new Map<string, DiscoveredCompany>();
  const conflicts = new Set<string>();
  let fcaTickerCount = 0;

  for (const record of options.fcaSecurities) {
    if (representationKey(record) !== latestByCnpj.get(record.cnpj)) continue;
    const ticker = record.ticker;
    const shareClass = shareClassFor(record);
    if (
      !shareClass ||
      !/^[A-Z]{4}[0-9]{1,2}$/.test(ticker) ||
      normalizeText(record.market) !== "BOLSA" ||
      normalizeText(record.administrator) !== "B3" ||
      (record.tradingEndDate !== null && record.tradingEndDate < options.today)
    ) {
      continue;
    }
    fcaTickerCount += 1;

    if (options.b3Tickers && !options.b3Tickers.has(ticker)) {
      warnings.push({
        code: "TICKER_NOT_FOUND_AT_B3",
        ticker,
        cnpj: record.cnpj,
        message: `${ticker} consta no FCA, mas não no cadastro atual de ações da B3.`,
      });
      continue;
    }

    const activeCodes = activeCodesByCnpj.get(record.cnpj);
    if (!activeCodes || activeCodes.size === 0) {
      warnings.push({
        code: "ACTIVE_CVM_CODE_NOT_FOUND",
        ticker,
        cnpj: record.cnpj,
        message: `${ticker} não possui código CVM ativo associado ao CNPJ.`,
      });
      continue;
    }
    if (activeCodes.size > 1) {
      warnings.push({
        code: "AMBIGUOUS_ACTIVE_CVM_CODE",
        ticker,
        cnpj: record.cnpj,
        message: `${ticker} possui mais de um código CVM ativo para o mesmo CNPJ.`,
      });
      continue;
    }

    const registry = [...activeCodes.values()][0];
    const candidate: DiscoveredCompany = {
      ticker,
      cvmCode: registry.cvmCode,
      cnpj: record.cnpj,
      companyName: registry.companyName || record.companyName,
      shareClass,
      shareClassDetail: shareClassDetail(record, shareClass),
      fundamentalsEnabled: canCalculateAutomatically(ticker),
      isActive: true,
      discoverySource: "cvm_fca",
    };
    const previous = candidates.get(ticker);
    if (
      previous &&
      (previous.cnpj !== candidate.cnpj ||
        previous.cvmCode !== candidate.cvmCode ||
        previous.shareClass !== candidate.shareClass)
    ) {
      conflicts.add(ticker);
      candidates.delete(ticker);
      warnings.push({
        code: "CONFLICTING_TICKER_MAPPING",
        ticker,
        message: `${ticker} apareceu associado a mais de uma companhia ou classe.`,
      });
      continue;
    }
    if (!conflicts.has(ticker)) candidates.set(ticker, candidate);
  }

  const listedByPrefix = new Map<string, B3ListedCompany[]>();
  for (const company of options.b3ListedCompanies ?? []) {
    const matches = listedByPrefix.get(company.issuingCompany) ?? [];
    matches.push(company);
    listedByPrefix.set(company.issuingCompany, matches);
  }
  const unmappedB3Tickers: string[] = [];
  for (const ticker of options.b3Tickers ?? []) {
    if (candidates.has(ticker) || conflicts.has(ticker)) continue;
    const suffix = Number(ticker.slice(4));
    const shareClass = suffix === 3 ? "ON" : suffix >= 4 && suffix <= 8 ? "PN" : null;
    if (!shareClass) continue;

    const listedMatches = new Map<string, B3ListedCompany>();
    for (const company of listedByPrefix.get(ticker.slice(0, 4)) ?? []) {
      const activeCodes = activeCodesByCnpj.get(company.cnpj);
      if (!activeCodes?.has(company.cvmCode)) continue;
      listedMatches.set(`${company.cvmCode}:${company.cnpj}`, company);
    }
    if (listedMatches.size === 0) {
      unmappedB3Tickers.push(ticker);
      continue;
    }
    if (listedMatches.size > 1) {
      warnings.push({
        code: "AMBIGUOUS_B3_COMPANY_MAPPING",
        ticker,
        message: `${ticker} possui mais de uma associação ativa no cadastro de companhias da B3.`,
      });
      continue;
    }
    const listed = [...listedMatches.values()][0];
    const registry = activeCodesByCnpj.get(listed.cnpj)?.get(listed.cvmCode);
    const pnDetails: Record<number, string> = {
      4: "PN",
      5: "PNA",
      6: "PNB",
      7: "PNC",
      8: "PND",
    };
    candidates.set(ticker, {
      ticker,
      cvmCode: listed.cvmCode,
      cnpj: listed.cnpj,
      companyName: registry?.companyName || listed.companyName,
      shareClass,
      shareClassDetail: shareClass === "ON" ? "ON" : pnDetails[suffix] ?? "PN",
      fundamentalsEnabled: canCalculateAutomatically(ticker),
      isActive: true,
      discoverySource: "b3_listed",
    });
  }
  if (unmappedB3Tickers.length > 0) {
    warnings.push({
      code: "B3_COMPANY_MAPPING_NOT_FOUND",
      message:
        `${unmappedB3Tickers.length} instrumentos classificados como ações pela B3 ` +
        "não puderam ser associados a uma companhia CVM ativa; foram ignorados. " +
        `Exemplos: ${unmappedB3Tickers.slice(0, 10).join(", ")}.`,
    });
  }

  return {
    companies: [...candidates.values()].sort((left, right) =>
      left.ticker.localeCompare(right.ticker),
    ),
    warnings,
    fcaTickerCount,
  };
}
