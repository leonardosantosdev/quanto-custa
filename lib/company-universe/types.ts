import type { ShareClass } from "@/lib/cvm/types";

export interface CompanySyncRecord {
  ticker: string;
  cvmCode: string;
  cnpj: string;
  companyName: string;
  shareClass: ShareClass;
  shareClassDetail: string;
  fundamentalsEnabled: boolean;
  isActive: boolean;
  discoverySource: "cvm_fca" | "b3_listed" | "manual";
}

export interface DiscoveredCompany extends CompanySyncRecord {
  discoverySource: "cvm_fca" | "b3_listed";
}

export interface UniverseWarning {
  code: string;
  message: string;
  ticker?: string;
  cnpj?: string;
}

export interface B3ListedCompany {
  issuingCompany: string;
  cvmCode: string;
  cnpj: string;
  companyName: string;
}

export interface B3InstrumentSnapshot {
  schemaVersion?: number;
  sourceDate: string;
  tickers: string[];
  listedCompanies?: B3ListedCompany[];
}

export interface CompanyUniverseBuildResult {
  companies: DiscoveredCompany[];
  warnings: UniverseWarning[];
  fcaTickerCount: number;
}

export interface CompanyUniverseSyncSummary {
  status: "success" | "partial" | "already-running";
  universeChanged: boolean;
  companiesDiscovered: number;
  companiesUpserted: number;
  companiesDeactivated: number;
  fundamentalsEnabled: number;
  b3SourceDate: string | null;
  b3Validated: boolean;
  warnings: UniverseWarning[];
}

export interface StoredB3Snapshot {
  snapshot: B3InstrumentSnapshot;
  lastCheckedAt: string;
}
