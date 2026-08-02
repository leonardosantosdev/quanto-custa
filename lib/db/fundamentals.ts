import "server-only";

import { getDatabase } from "@/lib/db/client";
import type { ShareClass } from "@/lib/cvm/types";

export interface StoredFundamentals {
  ticker: string;
  cvmCode: string;
  cnpj: string;
  companyName: string;
  shareClass: ShareClass;
  eps: number;
  bookValuePerShare: number;
  referenceDate: string;
  documentType: "ITR" | "DFP";
  documentVersion: number;
  officialDocumentId: number;
  documentReceivedAt: string;
  calculationMethod: string;
  calculationDetails: Record<string, unknown>;
  updatedAt: string;
}

function isoValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function getStockFundamentals(
  ticker: string,
): Promise<StoredFundamentals | null> {
  const sql = getDatabase();
  const [row] = await sql<
    {
      ticker: string;
      cvm_code: string;
      cnpj: string;
      company_name: string;
      share_class: ShareClass;
      eps: string | number;
      book_value_per_share: string | number;
      reference_date: string | Date;
      document_type: "ITR" | "DFP";
      document_version: number;
      official_document_id: number;
      document_received_at: string | Date;
      calculation_method: string;
      calculation_details: Record<string, unknown>;
      updated_at: string | Date;
    }[]
  >`
    SELECT
      c.ticker,
      c.cvm_code,
      c.cnpj,
      c.company_name,
      c.share_class,
      f.eps,
      f.book_value_per_share,
      f.reference_date,
      f.document_type,
      f.document_version,
      f.official_document_id,
      f.document_received_at,
      f.calculation_method,
      f.calculation_details,
      f.updated_at
    FROM companies c
    JOIN fundamentals f ON f.ticker = c.ticker
    WHERE c.ticker = ${ticker.toUpperCase()} AND c.is_active = TRUE
    LIMIT 1
  `;

  if (!row) return null;

  return {
    ticker: row.ticker,
    cvmCode: row.cvm_code,
    cnpj: row.cnpj,
    companyName: row.company_name,
    shareClass: row.share_class,
    eps: Number(row.eps),
    bookValuePerShare: Number(row.book_value_per_share),
    referenceDate: isoValue(row.reference_date).slice(0, 10),
    documentType: row.document_type,
    documentVersion: row.document_version,
    officialDocumentId: Number(row.official_document_id),
    documentReceivedAt: isoValue(row.document_received_at).slice(0, 10),
    calculationMethod: row.calculation_method,
    calculationDetails: row.calculation_details,
    updatedAt: isoValue(row.updated_at),
  };
}

export async function findActiveCompanies(query: string) {
  const sql = getDatabase();
  const pattern = `%${query.trim()}%`;
  return sql<
    {
      ticker: string;
      company_name: string;
      share_class: ShareClass;
      fundamentals_available: boolean;
    }[]
  >`
    SELECT
      c.ticker,
      c.company_name,
      c.share_class,
      EXISTS (SELECT 1 FROM fundamentals f WHERE f.ticker = c.ticker)
        AS fundamentals_available
    FROM companies c
    WHERE c.is_active = TRUE
      AND (c.ticker ILIKE ${pattern} OR c.company_name ILIKE ${pattern})
    ORDER BY
      CASE WHEN c.ticker = ${query.trim().toUpperCase()} THEN 0 ELSE 1 END,
      c.ticker
    LIMIT 8
  `;
}

export async function getActiveCompany(ticker: string) {
  const sql = getDatabase();
  const [row] = await sql<
    {
      ticker: string;
      company_name: string;
      share_class: ShareClass;
    }[]
  >`
    SELECT ticker, company_name, share_class
    FROM companies
    WHERE ticker = ${ticker.toUpperCase()} AND is_active = TRUE
    LIMIT 1
  `;
  return row ?? null;
}
