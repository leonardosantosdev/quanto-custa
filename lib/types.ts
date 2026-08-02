export type DataSource = "cvm" | "demo";
export type CalculationMode = "automatic" | "manual";
export type CalculationMethod = "graham" | "bazin";

export interface StockSearchResult {
  ticker: string;
  name: string;
  assetClass: string;
  supported: boolean;
  calculationMode: CalculationMode;
}

export interface ManualStockSnapshot {
  ticker: string;
  name: string;
  assetClass: string;
  price: number;
  updatedAt: string;
}

export interface StockSnapshot {
  ticker: string;
  name: string;
  assetClass: string;
  price: number;
  eps: number | null;
  bookValuePerShare: number | null;
  updatedAt: string;
  referenceDate: string | null;
  fundamentalsUpdatedAt: string;
  documentReceivedAt: string | null;
  documentType: "ITR" | "DFP" | null;
  documentVersion: number | null;
  source: DataSource;
  fallbackFromApi?: boolean;
}

export type StockLookupResult =
  | { status: "success"; stock: StockSnapshot }
  | { status: "manual"; stock: ManualStockSnapshot; message: string }
  | { status: "not-found"; message: string }
  | { status: "unsupported"; message: string }
  | { status: "error"; message: string };

export interface BazinStockSnapshot {
  ticker: string;
  name: string;
  assetClass: string;
  price: number;
  updatedAt: string;
  dividendsPerShare: number;
  jcpGrossPerShare: number;
  jcpNetPerShare: number;
  netProceedsPerShare: number;
  eventCount: number;
  periodStart: string;
  periodEnd: string;
  proceedsUpdatedAt: string;
  source: "b3";
}

export type BazinStockLookupResult =
  | { status: "success"; stock: BazinStockSnapshot }
  | { status: "manual"; stock: ManualStockSnapshot; message: string }
  | { status: "not-found"; message: string }
  | { status: "unsupported"; message: string }
  | { status: "error"; message: string };

export interface SearchResponse {
  results: StockSearchResult[];
  demo: boolean;
  message?: string;
}
