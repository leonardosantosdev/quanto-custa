import { Readable } from "node:stream";

import { parse } from "csv-parse";
import iconv from "iconv-lite";
import ParseZip from "unzipper/lib/parse";
import type { Entry } from "unzipper";

import type {
  B3InstrumentSnapshot,
  B3ListedCompany,
} from "@/lib/company-universe/types";

const CVM_FCA_BASE_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FCA/DADOS";
const CVM_REGISTRY_URL =
  "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv";
const B3_FILES_BASE_URL = "https://arquivos.b3.com.br/api";
const B3_LISTED_COMPANIES_URL =
  "https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetInitialCompanies";
const REQUEST_TIMEOUT_MS = 120_000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} respondeu com ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

export async function loadCurrentFcaSecuritiesCsv(now = new Date()): Promise<{
  url: string;
  csv: string;
}> {
  const year = now.getUTCFullYear();
  const url = `${CVM_FCA_BASE_URL}/fca_cia_aberta_${year}.zip`;
  const archive = await fetchBuffer(url);
  const filename = `fca_cia_aberta_valor_mobiliario_${year}.csv`;
  const zip = Readable.from(archive).pipe(ParseZip({ forceStream: true }));
  for await (const rawEntry of zip) {
    const entry = rawEntry as Entry;
    if (entry.path.replace(/\\/g, "/").split("/").at(-1) === filename) {
      return { url, csv: iconv.decode(await entry.buffer(), "windows-1252") };
    }
    entry.autodrain();
  }
  throw new Error(`${filename} não foi encontrado no arquivo FCA.`);
}

export async function loadCvmRegistryCsv(): Promise<{
  url: string;
  csv: string;
}> {
  const content = await fetchBuffer(CVM_REGISTRY_URL);
  return {
    url: CVM_REGISTRY_URL,
    csv: iconv.decode(content, "windows-1252"),
  };
}

export function isCurrentB3Share(record: Record<string, string | undefined>): boolean {
  const ticker = record.TckrSymb?.trim().toUpperCase() ?? "";
  return (
    record.SgmtNm?.trim() === "CASH" &&
    record.MktNm?.trim() === "EQUITY-CASH" &&
    record.SctyCtgyNm?.trim() === "SHARES" &&
    record.TradgEndDt?.trim() === "9999-12-31" &&
    /^[A-Z]{4}[0-9]{1,2}$/.test(ticker)
  );
}

async function requestB3Download(date: string): Promise<{
  response: Response;
  sourceDate: string;
} | null> {
  const requestUrl = new URL(`${B3_FILES_BASE_URL}/download/requestname`);
  requestUrl.searchParams.set("fileName", "InstrumentsConsolidated");
  requestUrl.searchParams.set("date", date);
  const request = await fetch(requestUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!request.ok) return null;
  const payload = (await request.json()) as { token?: unknown };
  if (typeof payload.token !== "string" || !payload.token) return null;

  const downloadUrl = new URL(`${B3_FILES_BASE_URL}/download/`);
  downloadUrl.searchParams.set("token", payload.token);
  const response = await fetch(downloadUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok || !response.body) return null;
  return { response, sourceDate: date };
}

async function parseB3TickerStream(response: Response): Promise<string[]> {
  if (!response.body) throw new Error("Arquivo de instrumentos da B3 sem conteúdo.");
  const parser = parse({
    columns: true,
    delimiter: ";",
    from_line: 2,
    bom: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  });
  Readable.fromWeb(response.body as never).pipe(parser);
  const tickers = new Set<string>();
  for await (const rawRecord of parser) {
    const record = rawRecord as Record<string, string | undefined>;
    if (isCurrentB3Share(record)) {
      tickers.add(record.TckrSymb?.trim().toUpperCase() ?? "");
    }
  }
  return [...tickers].sort();
}

interface B3ListedCompaniesResponse {
  page?: { totalPages?: unknown };
  results?: Array<{
    codeCVM?: unknown;
    issuingCompany?: unknown;
    companyName?: unknown;
    cnpj?: unknown;
    status?: unknown;
  }>;
}

async function loadB3ListedCompaniesPage(
  pageNumber: number,
): Promise<B3ListedCompaniesResponse> {
  const payload = Buffer.from(JSON.stringify({
    language: "pt-br",
    pageNumber,
    pageSize: 120,
  })).toString("base64");
  const response = await fetch(`${B3_LISTED_COMPANIES_URL}/${payload}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Cadastro de companhias da B3 respondeu com ${response.status}.`);
  }
  return response.json() as Promise<B3ListedCompaniesResponse>;
}

export async function loadB3ListedCompanies(): Promise<B3ListedCompany[]> {
  const firstPage = await loadB3ListedCompaniesPage(1);
  const totalPages = Number(firstPage.page?.totalPages);
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) {
    throw new Error("Cadastro de companhias da B3 retornou paginação inválida.");
  }
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      loadB3ListedCompaniesPage(index + 2),
    ),
  );
  const unique = new Map<string, B3ListedCompany>();
  for (const record of [firstPage, ...remaining].flatMap((page) => page.results ?? [])) {
    if (record.status !== "A") continue;
    if (
      typeof record.codeCVM !== "string" ||
      typeof record.issuingCompany !== "string" ||
      typeof record.companyName !== "string" ||
      typeof record.cnpj !== "string"
    ) {
      continue;
    }
    const issuingCompany = record.issuingCompany
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
    const cvmCode = record.codeCVM.replace(/^0+/, "");
    const cnpj = record.cnpj.replace(/\D/g, "").padStart(14, "0");
    if (!/^[A-Z]{4}$/.test(issuingCompany) || !/^\d+$/.test(cvmCode) || cnpj.length !== 14) {
      continue;
    }
    unique.set(`${issuingCompany}:${cvmCode}:${cnpj}`, {
      issuingCompany,
      cvmCode,
      cnpj,
      companyName: record.companyName.trim(),
    });
  }
  return [...unique.values()];
}

export async function loadLatestB3InstrumentSnapshot(
  now = new Date(),
): Promise<B3InstrumentSnapshot> {
  for (let daysAgo = 0; daysAgo < 10; daysAgo += 1) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() - daysAgo);
    const date = isoDate(candidate);
    const download = await requestB3Download(date);
    if (!download) continue;
    const [tickers, listedCompanies] = await Promise.all([
      parseB3TickerStream(download.response),
      loadB3ListedCompanies(),
    ]);
    if (tickers.length > 0) {
      return { schemaVersion: 2, sourceDate: download.sourceDate, tickers, listedCompanies };
    }
  }
  throw new Error("A B3 não disponibilizou um cadastro de instrumentos nos últimos 10 dias.");
}

export const COMPANY_UNIVERSE_SOURCE_URLS = {
  cvmRegistry: CVM_REGISTRY_URL,
  b3Instruments: "https://arquivos.b3.com.br/tabelas/InstrumentsConsolidated",
  b3ListedCompanies: B3_LISTED_COMPANIES_URL,
} as const;
