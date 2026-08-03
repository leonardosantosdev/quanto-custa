import { createHash } from "node:crypto";

import { jcpNetFactor } from "@/lib/bazin";
import type {
  B3CashDividendRecord,
  B3CompanySupplement,
  B3StockDividendRecord,
  CashProceedsCandidate,
  CashProceedsType,
  DividendTarget,
  ParsedDividendSnapshot,
} from "@/lib/b3-dividends/types";

function normalizeText(value: unknown): string {
  return typeof value === "string"
    ? value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ")
    : "";
}

function parseBrazilianNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseB3Date(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return iso;
}

function proceedsType(label: string): CashProceedsType | null {
  if (label === "DIVIDENDO") return "dividend";
  if (label === "JRS CAP PROPRIO" || label === "JUROS CAP PROPRIO") return "jcp";
  return null;
}

function targetIsinClass(shareClassDetail: string): string | null {
  const normalized = normalizeText(shareClassDetail).replace(/[^A-Z]/g, "");
  const mapping: Record<string, string> = {
    ON: "OR",
    PN: "PR",
    PNA: "PA",
    PNB: "PB",
    PNC: "PC",
    PND: "PD",
  };
  return mapping[normalized] ?? null;
}

function isinClass(isin: string): string | null {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin) ? isin.slice(9, 11) : null;
}

function actionMultiplier(record: B3StockDividendRecord): number | null {
  const label = normalizeText(record.label);
  const factor = parseBrazilianNumber(record.factor);
  if (factor === null || factor <= 0) return null;
  if (label === "DESDOBRAMENTO" || label === "BONIFICACAO") {
    return 1 + factor / 100;
  }
  if (label === "GRUPAMENTO") return factor;
  return null;
}

function adjustmentFactor(options: {
  isinCode: string;
  exDate: string;
  nowDate: string;
  stockDividends: readonly B3StockDividendRecord[];
}): number {
  return options.stockDividends.reduce((factor, record) => {
    if (normalizeText(record.isinCode) !== options.isinCode) return factor;
    const actionDate = parseB3Date(record.lastDatePrior);
    if (!actionDate || actionDate <= options.exDate || actionDate > options.nowDate) {
      return factor;
    }
    const multiplier = actionMultiplier(record);
    return multiplier === null ? factor : factor * multiplier;
  }, 1);
}

function eventKey(candidate: Omit<CashProceedsCandidate, "eventKey">): string {
  return createHash("sha256")
    .update(
      [
        candidate.ticker,
        candidate.isinCode,
        candidate.sourceLabel,
        candidate.approvalDate,
        candidate.exDate,
        candidate.paymentDate ?? "",
        candidate.originalValuePerShare.toFixed(12),
        candidate.relatedTo ?? "",
      ].join("|"),
    )
    .digest("hex");
}

function oneYearBefore(now: Date): string {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff.toISOString().slice(0, 10);
}

export function parseB3DividendSnapshot(options: {
  snapshot: B3CompanySupplement;
  targets: readonly DividendTarget[];
  now?: Date;
}): ParsedDividendSnapshot {
  const now = options.now ?? new Date();
  const nowDate = now.toISOString().slice(0, 10);
  const cutoff = oneYearBefore(now);
  const cashDividends = options.snapshot.cashDividends as B3CashDividendRecord[];
  const stockDividends = options.snapshot.stockDividends as B3StockDividendRecord[];
  const warnings: string[] = [];
  const candidates: CashProceedsCandidate[] = [];

  for (const record of cashDividends) {
    const label = normalizeText(record.label);
    const type = proceedsType(label);
    if (!type) continue;

    const isinCode = normalizeText(record.isinCode);
    const classCode = isinClass(isinCode);
    const originalValue = parseBrazilianNumber(record.rate);
    const approvalDate = parseB3Date(record.approvedOn);
    const exDate = parseB3Date(record.lastDatePrior);
    const paymentDate = parseB3Date(record.paymentDate);
    if (!classCode || !originalValue || !approvalDate || !exDate) {
      warnings.push(`Evento ${label || "sem rótulo"} ignorado por dados inválidos.`);
      continue;
    }
    if (exDate < cutoff || exDate > nowDate) continue;

    const matchingTargets = options.targets.filter(
      (target) => targetIsinClass(target.shareClassDetail) === classCode,
    );
    if (matchingTargets.length === 0) {
      warnings.push(`Nenhum ticker ativo corresponde ao ISIN ${isinCode}.`);
      continue;
    }

    const factor = adjustmentFactor({ isinCode, exDate, nowDate, stockDividends });
    const adjustedGross = originalValue / factor;
    for (const target of matchingTargets) {
      const candidateWithoutKey: Omit<CashProceedsCandidate, "eventKey"> = {
        ticker: target.ticker,
        isinCode,
        proceedsType: type,
        sourceLabel: label,
        grossValuePerShare: adjustedGross,
        netValuePerShare:
          type === "jcp" ? adjustedGross * jcpNetFactor(approvalDate) : adjustedGross,
        originalValuePerShare: originalValue,
        adjustmentFactor: factor,
        approvalDate,
        exDate,
        paymentDate: paymentDate?.startsWith("9999-") ? null : paymentDate,
        relatedTo:
          typeof record.relatedTo === "string" && record.relatedTo.trim()
            ? record.relatedTo.trim()
            : null,
        remarks:
          typeof record.remarks === "string" && record.remarks.trim()
            ? record.remarks.trim()
            : null,
      };
      candidates.push({
        ...candidateWithoutKey,
        eventKey: eventKey(candidateWithoutKey),
      });
    }
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.eventKey, candidate])).values(),
  );
  if (uniqueCandidates.length < candidates.length) {
    warnings.push(
      `${candidates.length - uniqueCandidates.length} evento(s) duplicado(s) pela B3 foram consolidados.`,
    );
  }
  uniqueCandidates.sort((left, right) =>
    `${left.ticker}:${left.exDate}:${left.eventKey}`.localeCompare(
      `${right.ticker}:${right.exDate}:${right.eventKey}`,
    ),
  );
  const sourceHash = createHash("sha256")
    .update(JSON.stringify(uniqueCandidates))
    .digest("hex");
  return { candidates: uniqueCandidates, warnings, sourceHash };
}
