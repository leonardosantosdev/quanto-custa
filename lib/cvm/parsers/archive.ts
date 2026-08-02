import { Readable } from "node:stream";

import { parse } from "csv-parse";
import { parse as parseSync } from "csv-parse/sync";
import iconv from "iconv-lite";
import ParseZip from "unzipper/lib/parse";
import type { Entry } from "unzipper";

import {
  normalizeCnpj,
  normalizeCvmCode,
  normalizeText,
  parseCvmDate,
  parseCvmNumber,
} from "@/lib/cvm/normalizers";
import type {
  CvmCapitalRow,
  CvmDocumentBundle,
  CvmDocumentMetadata,
  CvmDocumentType,
  CvmSourceSnapshot,
  CvmStatementRow,
  TrackedCompany,
} from "@/lib/cvm/types";

type CsvRecord = Record<string, string | undefined>;
type CvmCsvKind = "metadata" | "income" | "balance" | "capital";

interface ParseContext {
  documentType: CvmDocumentType;
  cvmCodes: Set<string>;
  cnpjs: Set<string>;
}

interface ParsedRows {
  metadata: CvmDocumentMetadata[];
  income: CvmStatementRow[];
  balance: CvmStatementRow[];
  capital: CvmCapitalRow[];
}

function parseRequiredDate(value: string | undefined): string | null {
  return parseCvmDate(value);
}

function parseMetadata(
  record: CsvRecord,
  context: ParseContext,
): CvmDocumentMetadata | null {
  const cvmCode = normalizeCvmCode(record.CD_CVM ?? "");
  const documentType = normalizeText(record.CATEG_DOC ?? "");
  if (!context.cvmCodes.has(cvmCode) || documentType !== context.documentType) {
    return null;
  }

  const referenceDate = parseRequiredDate(record.DT_REFER);
  const receivedAt = parseRequiredDate(record.DT_RECEB);
  const version = parseCvmNumber(record.VERSAO);
  const officialDocumentId = parseCvmNumber(record.ID_DOC);
  if (
    !referenceDate ||
    !receivedAt ||
    version === null ||
    officialDocumentId === null
  ) {
    return null;
  }

  return {
    cnpj: normalizeCnpj(record.CNPJ_CIA ?? ""),
    cvmCode,
    companyName: record.DENOM_CIA?.trim() ?? "",
    referenceDate,
    version,
    documentType: context.documentType,
    officialDocumentId,
    receivedAt,
  };
}

function shouldKeepStatement(
  record: CsvRecord,
  kind: "income" | "balance",
): boolean {
  const accountCode = record.CD_CONTA?.trim() ?? "";
  if (kind === "income") {
    const description = normalizeText(record.DS_CONTA ?? "");
    const controllerProfit =
      description.includes("ATRIBUIDO") &&
      description.includes("CONTROLADOR") &&
      !description.includes("NAO CONTROLADOR");
    const individualProfit =
      description === "LUCRO PREJUIZO DO PERIODO" ||
      description === "RESULTADO LIQUIDO DO PERIODO";
    return (
      ["3.11", "3.11.01", "3.13", "3.99", "3.99.01.01", "3.99.01.02"].includes(
        accountCode,
      ) ||
      controllerProfit ||
      individualProfit
    );
  }

  const description = normalizeText(record.DS_CONTA ?? "");
  return (
    description.includes("PATRIMONIO LIQUIDO CONSOLIDADO") ||
    description.includes("PATRIMONIO LIQUIDO ATRIBUIDO") ||
    description.includes("PARTICIPACAO DOS ACIONISTAS NAO CONTROLADORES") ||
    description === "PATRIMONIO LIQUIDO"
  );
}

function parseStatement(
  record: CsvRecord,
  context: ParseContext,
  kind: "income" | "balance",
): CvmStatementRow | null {
  const cvmCode = normalizeCvmCode(record.CD_CVM ?? "");
  if (
    !context.cvmCodes.has(cvmCode) ||
    !["CONSOLIDADO", "INDIVIDUAL"].some((basis) =>
      normalizeText(record.GRUPO_DFP ?? "").includes(basis),
    ) ||
    !shouldKeepStatement(record, kind)
  ) {
    return null;
  }

  const referenceDate = parseRequiredDate(record.DT_REFER);
  const endDate = parseRequiredDate(record.DT_FIM_EXERC);
  const startDate = parseCvmDate(record.DT_INI_EXERC);
  const version = parseCvmNumber(record.VERSAO);
  const value = parseCvmNumber(record.VL_CONTA);
  if (!referenceDate || !endDate || version === null || value === null) return null;

  return {
    cnpj: normalizeCnpj(record.CNPJ_CIA ?? ""),
    cvmCode,
    referenceDate,
    version,
    statementGroup: record.GRUPO_DFP?.trim() ?? "",
    currency: record.MOEDA?.trim() ?? "",
    monetaryScale: record.ESCALA_MOEDA?.trim() ?? "",
    exerciseOrder: record.ORDEM_EXERC?.trim() ?? "",
    startDate,
    endDate,
    accountCode: record.CD_CONTA?.trim() ?? "",
    accountDescription: record.DS_CONTA?.trim() ?? "",
    value,
    fixedAccount: normalizeText(record.ST_CONTA_FIXA ?? "") === "S",
  };
}

function parseCapital(
  record: CsvRecord,
  context: ParseContext,
): CvmCapitalRow | null {
  const cnpj = normalizeCnpj(record.CNPJ_CIA ?? "");
  if (!context.cnpjs.has(cnpj)) return null;
  const referenceDate = parseRequiredDate(record.DT_REFER);
  const version = parseCvmNumber(record.VERSAO);
  if (!referenceDate || version === null) return null;

  return {
    cnpj,
    referenceDate,
    version,
    companyName: record.DENOM_CIA?.trim() ?? "",
    issuedOn: parseCvmNumber(record.QT_ACAO_ORDIN_CAP_INTEGR),
    issuedPn: parseCvmNumber(record.QT_ACAO_PREF_CAP_INTEGR),
    issuedTotal: parseCvmNumber(record.QT_ACAO_TOTAL_CAP_INTEGR),
    treasuryOn: parseCvmNumber(record.QT_ACAO_ORDIN_TESOURO),
    treasuryPn: parseCvmNumber(record.QT_ACAO_PREF_TESOURO),
    treasuryTotal: parseCvmNumber(record.QT_ACAO_TOTAL_TESOURO),
  };
}

function mapRecord(
  record: CsvRecord,
  kind: CvmCsvKind,
  context: ParseContext,
): CvmDocumentMetadata | CvmStatementRow | CvmCapitalRow | null {
  if (kind === "metadata") return parseMetadata(record, context);
  if (kind === "capital") return parseCapital(record, context);
  return parseStatement(record, context, kind);
}

function documentKey(cnpj: string, referenceDate: string, version: number): string {
  return `${cnpj}:${referenceDate}:${version}`;
}

function buildSnapshot(rows: ParsedRows): CvmSourceSnapshot {
  const income = new Map<string, CvmStatementRow[]>();
  const balance = new Map<string, CvmStatementRow[]>();
  const capital = new Map<string, CvmCapitalRow>();

  for (const row of rows.income) {
    const key = documentKey(row.cnpj, row.referenceDate, row.version);
    income.set(key, [...(income.get(key) ?? []), row]);
  }
  for (const row of rows.balance) {
    const key = documentKey(row.cnpj, row.referenceDate, row.version);
    balance.set(key, [...(balance.get(key) ?? []), row]);
  }
  for (const row of rows.capital) {
    capital.set(documentKey(row.cnpj, row.referenceDate, row.version), row);
  }

  const documents: CvmDocumentBundle[] = rows.metadata.map((metadata) => {
    const key = documentKey(metadata.cnpj, metadata.referenceDate, metadata.version);
    return {
      metadata,
      incomeRows: income.get(key) ?? [],
      balanceRows: balance.get(key) ?? [],
      capital: capital.get(key) ?? null,
    };
  });

  return { documents };
}

function entryKind(
  filename: string,
  documentType: CvmDocumentType,
  year: number,
): CvmCsvKind | null {
  const prefix = documentType.toLowerCase();
  const exact: Record<string, CvmCsvKind> = {
    [`${prefix}_cia_aberta_${year}.csv`]: "metadata",
    [`${prefix}_cia_aberta_DRE_con_${year}.csv`]: "income",
    [`${prefix}_cia_aberta_DRE_ind_${year}.csv`]: "income",
    [`${prefix}_cia_aberta_BPP_con_${year}.csv`]: "balance",
    [`${prefix}_cia_aberta_BPP_ind_${year}.csv`]: "balance",
    [`${prefix}_cia_aberta_composicao_capital_${year}.csv`]: "capital",
  };
  return exact[filename] ?? null;
}

async function parseEntry(
  entry: Entry,
  kind: CvmCsvKind,
  context: ParseContext,
  rows: ParsedRows,
): Promise<void> {
  const parser = parse({
    columns: true,
    delimiter: ";",
    bom: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  });
  entry.pipe(iconv.decodeStream("windows-1252")).pipe(parser);

  for await (const rawRecord of parser) {
    const mapped = mapRecord(rawRecord as CsvRecord, kind, context);
    if (!mapped) continue;
    if (kind === "metadata") rows.metadata.push(mapped as CvmDocumentMetadata);
    if (kind === "income") rows.income.push(mapped as CvmStatementRow);
    if (kind === "balance") rows.balance.push(mapped as CvmStatementRow);
    if (kind === "capital") rows.capital.push(mapped as CvmCapitalRow);
  }
}

export async function parseCvmArchive(
  archive: Buffer,
  documentType: CvmDocumentType,
  year: number,
  companies: readonly TrackedCompany[],
): Promise<CvmSourceSnapshot> {
  const context: ParseContext = {
    documentType,
    cvmCodes: new Set(companies.map((company) => company.cvmCode)),
    cnpjs: new Set(companies.map((company) => normalizeCnpj(company.cnpj))),
  };
  const rows: ParsedRows = { metadata: [], income: [], balance: [], capital: [] };
  const zip = Readable.from(archive).pipe(ParseZip({ forceStream: true }));

  for await (const rawEntry of zip) {
    const entry = rawEntry as Entry;
    const filename = entry.path.replace(/\\/g, "/").split("/").at(-1) ?? "";
    const kind = entryKind(filename, documentType, year);
    if (!kind) {
      entry.autodrain();
      continue;
    }
    await parseEntry(entry, kind, context, rows);
  }

  return buildSnapshot(rows);
}

export function parseCvmCsvFixture(
  text: string,
  kind: CvmCsvKind,
  documentType: CvmDocumentType,
  companies: readonly TrackedCompany[],
): Array<CvmDocumentMetadata | CvmStatementRow | CvmCapitalRow> {
  const context: ParseContext = {
    documentType,
    cvmCodes: new Set(companies.map((company) => company.cvmCode)),
    cnpjs: new Set(companies.map((company) => normalizeCnpj(company.cnpj))),
  };
  const records = parseSync(text, {
    columns: true,
    delimiter: ";",
    bom: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  }) as CsvRecord[];

  return records
    .map((record) => mapRecord(record, kind, context))
    .filter((row) => row !== null);
}
