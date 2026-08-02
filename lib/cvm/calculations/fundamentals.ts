import { calculateTrailingEps } from "@/lib/cvm/calculations/lpa";
import { calculateBookValuePerShare } from "@/lib/cvm/calculations/vpa";
import {
  selectLatestCompanyDocument,
  selectLatestRepresentations,
} from "@/lib/cvm/selectors/documents";
import type {
  CvmDocumentBundle,
  FundamentalCalculationResult,
  TrackedCompany,
} from "@/lib/cvm/types";
import { FUNDAMENTALS_PIPELINE_REVISION } from "@/lib/cvm/version";

export function calculateCompanyFundamentals(
  company: TrackedCompany,
  allDocuments: readonly CvmDocumentBundle[],
): FundamentalCalculationResult {
  const selectedDocuments = selectLatestRepresentations(allDocuments);
  const latest = selectLatestCompanyDocument(selectedDocuments, company.cvmCode);

  if (!latest) {
    return {
      status: "unavailable",
      failure: { ticker: company.ticker, reason: "Nenhum documento CVM encontrado." },
    };
  }

  const eps = calculateTrailingEps(latest, selectedDocuments);
  if (eps.status === "unavailable") {
    return {
      status: "unavailable",
      failure: { ticker: company.ticker, reason: eps.reason },
    };
  }

  const vpa = calculateBookValuePerShare(latest);
  if (vpa.status === "unavailable") {
    return {
      status: "unavailable",
      failure: { ticker: company.ticker, reason: vpa.reason },
    };
  }

  return {
    status: "valid",
    candidate: {
      ticker: company.ticker,
      eps: eps.value,
      bookValuePerShare: vpa.value,
      referenceDate: latest.metadata.referenceDate,
      documentType: latest.metadata.documentType,
      documentVersion: latest.metadata.version,
      officialDocumentId: latest.metadata.officialDocumentId,
      documentReceivedAt: latest.metadata.receivedAt,
      sourceCvmCode: latest.metadata.cvmCode,
      calculationMethod: `${eps.method}__controller_equity_over_total_issued_shares__${FUNDAMENTALS_PIPELINE_REVISION}`,
      calculationDetails: {
        epsAccountCode: eps.accountCode,
        epsPeriods: eps.periods,
        equityAccountCodes: vpa.equityAccountCodes,
        equityAmount: vpa.equity,
        outstandingShares: eps.issuedShares,
        shareQuantityScale: eps.shareQuantityScale,
        shareQuantityRule: eps.shareQuantityRule,
        monetaryScale: vpa.monetaryScale,
        classRule: vpa.classRule,
        statementBasis: eps.statementBasis,
      },
    },
  };
}
