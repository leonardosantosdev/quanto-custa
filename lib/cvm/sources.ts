import type { CvmSource } from "@/lib/cvm/types";

const CVM_BASE_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC";

export function getCvmSources(now = new Date()): CvmSource[] {
  const currentYear = now.getUTCFullYear();
  const previousYear = currentYear - 1;

  return [currentYear, previousYear].flatMap((year) => [
    {
      key: `ITR:${year}`,
      url: `${CVM_BASE_URL}/ITR/DADOS/itr_cia_aberta_${year}.zip`,
      documentType: "ITR" as const,
      year,
    },
    {
      key: `DFP:${year}`,
      url: `${CVM_BASE_URL}/DFP/DADOS/dfp_cia_aberta_${year}.zip`,
      documentType: "DFP" as const,
      year,
    },
  ]);
}
