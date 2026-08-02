import { createHash } from "node:crypto";

import { parseCvmArchive } from "@/lib/cvm/parsers/archive";
import { FUNDAMENTALS_PIPELINE_REVISION } from "@/lib/cvm/version";
import type {
  CvmSource,
  ProcessedSource,
  SourceCheckResult,
  StoredSourceState,
  TrackedCompany,
} from "@/lib/cvm/types";

const REQUEST_TIMEOUT_MS = 120_000;

function companyUniverseHash(companies: readonly TrackedCompany[]): string {
  const identity = companies
    .map((company) =>
      [company.ticker, company.cvmCode, company.cnpj, company.shareClass].join(":"),
    )
    .sort()
    .join("|");
  return createHash("sha256")
    .update(`${FUNDAMENTALS_PIPELINE_REVISION}|${identity}`)
    .digest("hex");
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function inspectCvmSource(
  source: CvmSource,
  state: StoredSourceState | null,
): Promise<SourceCheckResult> {
  const headers = new Headers();
  if (state?.sourceEtag) headers.set("If-None-Match", state.sourceEtag);
  if (state?.sourceLastModified) {
    headers.set("If-Modified-Since", state.sourceLastModified);
  }

  const response = await fetch(source.url, {
    method: "HEAD",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 304 && state?.metadata) {
    return {
      changed: false,
      etag: state.sourceEtag,
      lastModified: state.sourceLastModified,
      size: state.sourceSize,
    };
  }
  if (!response.ok) {
    throw new Error(`CVM HEAD ${source.key} respondeu com ${response.status}.`);
  }

  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");
  const size = parseContentLength(response.headers.get("content-length"));
  const comparisons = [
    etag && state?.sourceEtag ? etag === state.sourceEtag : null,
    lastModified && state?.sourceLastModified
      ? lastModified === state.sourceLastModified
      : null,
    size !== null && state?.sourceSize !== null && state?.sourceSize !== undefined
      ? size === state.sourceSize
      : null,
  ].filter((value): value is boolean => value !== null);
  const changed =
    !state?.metadata || comparisons.length === 0 || comparisons.some((same) => !same);

  return { changed, etag, lastModified, size };
}

export async function loadCvmSource(
  source: CvmSource,
  state: StoredSourceState | null,
  companies: readonly TrackedCompany[],
): Promise<ProcessedSource> {
  const check = await inspectCvmSource(source, state);
  const universeHash = companyUniverseHash(companies);
  const sameUniverse = state?.metadata?.companyUniverseHash === universeHash;

  if (!check.changed && state?.metadata && sameUniverse) {
    return {
      source,
      changed: false,
      downloaded: false,
      etag: check.etag,
      lastModified: check.lastModified,
      size: check.size,
      hash: state.sourceHash,
      snapshot: state.metadata,
      processingStatus: "success",
      errorMessage: null,
    };
  }

  const response = await fetch(source.url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`CVM GET ${source.key} respondeu com ${response.status}.`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  const hash = createHash("sha256").update(archive).digest("hex");

  if (state?.sourceHash === hash && state.metadata && sameUniverse) {
    return {
      source,
      changed: false,
      downloaded: true,
      etag: check.etag,
      lastModified: check.lastModified,
      size: archive.length,
      hash,
      snapshot: state.metadata,
      processingStatus: "success",
      errorMessage: null,
    };
  }

  const parsed = await parseCvmArchive(
    archive,
    source.documentType,
    source.year,
    companies,
  );
  const snapshot = { ...parsed, companyUniverseHash: universeHash };

  return {
    source,
    changed: true,
    downloaded: true,
    etag: check.etag,
    lastModified: check.lastModified,
    size: archive.length,
    hash,
    snapshot,
    processingStatus: "success",
    errorMessage: null,
  };
}
