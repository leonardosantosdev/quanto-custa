export function normalizeCvmCode(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function parseCvmDate(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  const parts = isoMatch
    ? { year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] }
    : brMatch
      ? { year: brMatch[3], month: brMatch[2], day: brMatch[1] }
      : null;

  if (!parts) return null;
  const normalized = `${parts.year}-${parts.month}-${parts.day}`;
  const date = new Date(`${normalized}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized;
}

export function parseCvmNumber(value: string | null | undefined): number | null {
  const input = value?.trim();
  if (!input) return null;

  let normalized = input.replace(/\s/g, "");

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function normalizeMoney(
  value: number,
  currency: string,
  monetaryScale: string,
): number | null {
  if (!Number.isFinite(value) || normalizeText(currency) !== "REAL") return null;

  const scale = normalizeText(monetaryScale);
  if (scale === "MIL") return value * 1_000;
  if (scale === "UNIDADE" || scale === "REAL") return value;
  return null;
}

export function isValidIsoDate(value: string): boolean {
  return parseCvmDate(value) === value;
}
