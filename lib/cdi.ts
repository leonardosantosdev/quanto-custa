export interface CdiReference {
  annualRatePercent: number;
  referenceDate: string;
}

interface BcbCdiRecord {
  data?: unknown;
  valor?: unknown;
}

export const BCB_CDI_SOURCE_URL =
  "https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?hdOidSeriesSelecionadas=4389&method=consultarGraficoPorId";

const BCB_CDI_API_URL =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/10?formato=json";

function parseBcbDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export async function getLatestCdiReference(): Promise<CdiReference | null> {
  try {
    const response = await fetch(BCB_CDI_API_URL, {
      next: { revalidate: 60 * 60 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const records = (await response.json()) as BcbCdiRecord[];
    const valid = records
      .map((record) => ({
        annualRatePercent:
          typeof record.valor === "string"
            ? Number(record.valor.replace(",", "."))
            : Number.NaN,
        referenceDate: parseBcbDate(record.data),
      }))
      .filter(
        (record): record is CdiReference =>
          Number.isFinite(record.annualRatePercent) && record.referenceDate !== null,
      )
      .sort((left, right) => right.referenceDate.localeCompare(left.referenceDate));
    return valid[0] ?? null;
  } catch {
    return null;
  }
}
