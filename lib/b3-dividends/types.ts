export interface B3CashDividendRecord {
  assetIssued?: unknown;
  paymentDate?: unknown;
  rate?: unknown;
  relatedTo?: unknown;
  approvedOn?: unknown;
  isinCode?: unknown;
  label?: unknown;
  lastDatePrior?: unknown;
  remarks?: unknown;
}

export interface B3StockDividendRecord {
  assetIssued?: unknown;
  factor?: unknown;
  approvedOn?: unknown;
  isinCode?: unknown;
  label?: unknown;
  lastDatePrior?: unknown;
  remarks?: unknown;
}

export interface B3CompanySupplement {
  code?: unknown;
  codeCVM?: unknown;
  tradingName?: unknown;
  cashDividends?: unknown;
  stockDividends?: unknown;
}

export interface DividendTarget {
  ticker: string;
  shareClassDetail: string;
}

export type CashProceedsType = "dividend" | "jcp";

export interface CashProceedsCandidate {
  ticker: string;
  eventKey: string;
  isinCode: string;
  proceedsType: CashProceedsType;
  sourceLabel: string;
  grossValuePerShare: number;
  netValuePerShare: number;
  originalValuePerShare: number;
  adjustmentFactor: number;
  approvalDate: string;
  exDate: string;
  paymentDate: string | null;
  relatedTo: string | null;
  remarks: string | null;
}

export interface ParsedDividendSnapshot {
  candidates: CashProceedsCandidate[];
  warnings: string[];
  sourceHash: string;
}

export interface DividendSyncTarget {
  issuingCompany: string;
  companies: DividendTarget[];
}

export interface DividendSyncSummary {
  status: "success" | "partial" | "already-running";
  issuersChecked: number;
  issuersUpdated: number;
  issuersFailed: number;
  eventsUpserted: number;
  warnings: number;
  full: boolean;
}
