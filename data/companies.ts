export interface SeedCompany {
  ticker: string;
  cvmCode: string;
  cnpj: string;
  companyName: string;
  shareClass: "ON" | "PN";
  shareClassDetail?: string;
  fundamentalsEnabled?: boolean;
  isActive: boolean;
}

// Conferido no cadastro diário oficial de companhias abertas da CVM:
// https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv
export const SEED_COMPANIES: readonly SeedCompany[] = [
  {
    ticker: "BBAS3",
    cvmCode: "1023",
    cnpj: "00.000.000/0001-91",
    companyName: "BANCO DO BRASIL S.A.",
    shareClass: "ON",
    isActive: true,
  },
  {
    ticker: "PETR4",
    cvmCode: "9512",
    cnpj: "33.000.167/0001-01",
    companyName: "PETRÓLEO BRASILEIRO S.A. - PETROBRAS",
    shareClass: "PN",
    isActive: true,
  },
  {
    ticker: "ITSA4",
    cvmCode: "7617",
    cnpj: "61.532.644/0001-15",
    companyName: "ITAUSA S.A.",
    shareClass: "PN",
    isActive: true,
  },
  {
    ticker: "WEGE3",
    cvmCode: "5410",
    cnpj: "84.429.695/0001-11",
    companyName: "WEG SA",
    shareClass: "ON",
    isActive: true,
  },
] as const;
