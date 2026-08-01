export type DataSource = "brapi" | "demo";

export interface StockSearchResult {
  ticker: string;
  name: string;
  assetClass: string;
  supported: boolean;
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
  source: DataSource;
  fallbackFromApi?: boolean;
}

export type StockLookupResult =
  | { status: "success"; stock: StockSnapshot }
  | { status: "not-found"; message: string }
  | { status: "unsupported"; message: string }
  | { status: "error"; message: string };

export interface SearchResponse {
  results: StockSearchResult[];
  demo: boolean;
  message?: string;
}
