import type {
  CvmDocumentBundle,
  CvmDocumentMetadata,
  FundamentalCandidate,
} from "@/lib/cvm/types";

function compareIso(left: string, right: string): number {
  return left.localeCompare(right);
}

export function compareDocumentMetadata(
  left: CvmDocumentMetadata,
  right: CvmDocumentMetadata,
): number {
  return (
    compareIso(left.referenceDate, right.referenceDate) ||
    left.version - right.version ||
    compareIso(left.receivedAt, right.receivedAt) ||
    left.officialDocumentId - right.officialDocumentId
  );
}

export function selectLatestRepresentations(
  documents: readonly CvmDocumentBundle[],
): CvmDocumentBundle[] {
  const selected = new Map<string, CvmDocumentBundle>();

  for (const document of documents) {
    const metadata = document.metadata;
    const key = [
      metadata.cvmCode,
      metadata.documentType,
      metadata.referenceDate,
    ].join(":");
    const current = selected.get(key);

    if (!current || compareDocumentMetadata(metadata, current.metadata) > 0) {
      selected.set(key, document);
    }
  }

  return [...selected.values()];
}

export function selectLatestCompanyDocument(
  documents: readonly CvmDocumentBundle[],
  cvmCode: string,
): CvmDocumentBundle | null {
  return (
    documents
      .filter((document) => document.metadata.cvmCode === cvmCode)
      .sort((left, right) =>
        compareDocumentMetadata(right.metadata, left.metadata),
      )[0] ?? null
  );
}

export interface ComparableFundamentalMetadata {
  referenceDate: string;
  documentType: "ITR" | "DFP";
  documentVersion: number;
  documentReceivedAt: string;
  officialDocumentId: number;
  calculationMethod?: string;
}

export function compareFundamentalVersions(
  left: ComparableFundamentalMetadata,
  right: ComparableFundamentalMetadata,
): number {
  return (
    compareIso(left.referenceDate, right.referenceDate) ||
    left.documentVersion - right.documentVersion ||
    compareIso(left.documentReceivedAt, right.documentReceivedAt) ||
    left.officialDocumentId - right.officialDocumentId
  );
}

export function shouldReplaceFundamental(
  candidate: FundamentalCandidate,
  current: ComparableFundamentalMetadata | null,
): boolean {
  if (!current) return true;
  return compareFundamentalVersions(candidate, current) > 0;
}

export function isSameFundamentalDocument(
  candidate: FundamentalCandidate,
  current: ComparableFundamentalMetadata,
): boolean {
  return (
    candidate.referenceDate === current.referenceDate &&
    candidate.documentType === current.documentType &&
    candidate.documentVersion === current.documentVersion &&
    candidate.officialDocumentId === current.officialDocumentId
  );
}
