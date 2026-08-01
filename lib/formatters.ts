import type { PriceComparison } from "@/lib/graham";

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const numberFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : dateTimeFormatter.format(date);
}

export function formatReferenceDate(value: string | null): string {
  if (!value) return "Não informada";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function formatComparisonSentence(
  ticker: string,
  price: number,
  grahamNumber: number,
  comparison: PriceComparison,
): string {
  if (comparison.status === "invalid") {
    return `Não foi possível comparar a cotação de ${ticker} com o Número de Graham.`;
  }

  const base = `O Número de Graham de ${ticker} é ${currencyFormatter.format(grahamNumber)}. A cotação considerada foi ${currencyFormatter.format(price)}.`;

  if (comparison.position === "equal") {
    return `${base} Com esses dados, a cotação coincide com o resultado da fórmula.`;
  }

  return `${base} Com esses dados, a cotação está ${percentFormatter.format(Math.abs(comparison.percentage))}% ${comparison.position === "below" ? "abaixo" : "acima"} do resultado da fórmula.`;
}
