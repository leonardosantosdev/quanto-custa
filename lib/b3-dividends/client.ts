import type { B3CompanySupplement } from "@/lib/b3-dividends/types";

const B3_COMPANY_SUPPLEMENT_URL =
  "https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany";
const REQUEST_TIMEOUT_MS = 30_000;

export async function loadB3CompanySupplement(
  issuingCompany: string,
): Promise<B3CompanySupplement> {
  const payload = Buffer.from(
    JSON.stringify({
      language: "pt-br",
      issuingCompany: issuingCompany.trim().toUpperCase(),
    }),
  ).toString("base64");
  const response = await fetch(`${B3_COMPANY_SUPPLEMENT_URL}/${payload}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Proventos da B3 responderam com ${response.status}.`);
  }

  let payloadData: unknown = await response.json();
  if (typeof payloadData === "string") {
    payloadData = JSON.parse(payloadData) as unknown;
  }
  const data = (Array.isArray(payloadData) ? payloadData[0] : payloadData) as
    | B3CompanySupplement
    | undefined;
  if (Array.isArray(payloadData) && payloadData.length === 0) {
    return { cashDividends: [], stockDividends: [] };
  }
  if (!data || typeof data !== "object") {
    throw new Error("Proventos da B3 retornaram uma resposta inválida.");
  }
  return {
    ...data,
    cashDividends: Array.isArray(data.cashDividends) ? data.cashDividends : [],
    stockDividends: Array.isArray(data.stockDividends) ? data.stockDividends : [],
  };
}

export const B3_COMPANY_SUPPLEMENT_SOURCE_URL = B3_COMPANY_SUPPLEMENT_URL;
