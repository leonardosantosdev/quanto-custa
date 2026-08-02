export type CvmDocumentType = "ITR" | "DFP";
export type ShareClass = "ON" | "PN";

export interface TrackedCompany {
  ticker: string;
  cvmCode: string;
  cnpj: string;
  companyName: string;
  shareClass: ShareClass;
  isActive: boolean;
}

export interface CvmSource {
  key: string;
  url: string;
  documentType: CvmDocumentType;
  year: number;
}

export interface CvmDocumentMetadata {
  cnpj: string;
  cvmCode: string;
  companyName: string;
  referenceDate: string;
  version: number;
  documentType: CvmDocumentType;
  officialDocumentId: number;
  receivedAt: string;
}

export interface CvmStatementRow {
  cnpj: string;
  cvmCode: string;
  referenceDate: string;
  version: number;
  statementGroup: string;
  currency: string;
  monetaryScale: string;
  exerciseOrder: string;
  startDate: string | null;
  endDate: string;
  accountCode: string;
  accountDescription: string;
  value: number;
  fixedAccount: boolean;
}

export interface CvmCapitalRow {
  cnpj: string;
  referenceDate: string;
  version: number;
  companyName: string;
  issuedOn: number | null;
  issuedPn: number | null;
  issuedTotal: number | null;
  treasuryOn: number | null;
  treasuryPn: number | null;
  treasuryTotal: number | null;
}

export interface CvmDocumentBundle {
  metadata: CvmDocumentMetadata;
  incomeRows: CvmStatementRow[];
  balanceRows: CvmStatementRow[];
  capital: CvmCapitalRow | null;
}

export interface CvmSourceSnapshot {
  documents: CvmDocumentBundle[];
  companyUniverseHash?: string;
}

export interface StoredSourceState<TMetadata = CvmSourceSnapshot> {
  sourceKey: string;
  sourceUrl: string;
  sourceLastModified: string | null;
  sourceEtag: string | null;
  sourceSize: number | null;
  sourceHash: string | null;
  lastCheckedAt: string;
  lastSuccessfulRun: string | null;
  status: string;
  errorMessage: string | null;
  metadata: TMetadata | null;
}

export interface SourceCheckResult {
  changed: boolean;
  etag: string | null;
  lastModified: string | null;
  size: number | null;
}

export interface ProcessedSource {
  source: CvmSource;
  changed: boolean;
  downloaded: boolean;
  etag: string | null;
  lastModified: string | null;
  size: number | null;
  hash: string | null;
  snapshot: CvmSourceSnapshot;
  processingStatus: "success" | "stale";
  errorMessage: string | null;
}

export interface CalculationDetails {
  epsAccountCode: string;
  epsPeriods: string[];
  equityAccountCodes: string[];
  equityAmount: number;
  outstandingShares: number;
  shareQuantityScale: number;
  shareQuantityRule: string;
  monetaryScale: string;
  classRule: string;
  statementBasis: "consolidated" | "individual";
}

export interface FundamentalCandidate {
  ticker: string;
  eps: number;
  bookValuePerShare: number;
  referenceDate: string;
  documentType: CvmDocumentType;
  documentVersion: number;
  officialDocumentId: number;
  documentReceivedAt: string;
  sourceCvmCode: string;
  calculationMethod: string;
  calculationDetails: CalculationDetails;
}

export interface CalculationFailure {
  ticker: string;
  reason: string;
}

export type FundamentalCalculationResult =
  | { status: "valid"; candidate: FundamentalCandidate }
  | { status: "unavailable"; failure: CalculationFailure };

export interface ValidationIssue {
  level: "warning" | "error";
  code: string;
  message: string;
}
