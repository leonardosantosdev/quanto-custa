import { describe, expect, it } from "vitest";

import { isCurrentB3Share } from "@/lib/company-universe/client";
import {
  buildCompanyUniverse,
  parseCvmRegistryCsv,
  parseFcaSecuritiesCsv,
} from "@/lib/company-universe/parser";

const fcaHeader = [
  "CNPJ_Companhia",
  "Data_Referencia",
  "Versao",
  "ID_Documento",
  "Nome_Empresarial",
  "Valor_Mobiliario",
  "Sigla_Classe_Acao_Preferencial",
  "Codigo_Negociacao",
  "Mercado",
  "Sigla_Entidade_Administradora",
  "Data_Fim_Negociacao",
].join(";");

describe("cadastro automático de companhias", () => {
  it("usa o FCA mais recente, somente códigos CVM ativos e valida na B3", () => {
    const fca = parseFcaSecuritiesCsv([
      fcaHeader,
      "11.111.111/0001-11;2025-12-31;1;10;CIA ANTIGA;Ações Ordinárias;;OLDX3;Bolsa;B3;",
      "11.111.111/0001-11;2026-03-31;2;20;CIA ATUAL;Ações Ordinárias;;ABCD3;Bolsa;B3;",
      "11.111.111/0001-11;2026-03-31;2;20;CIA ATUAL;Ações Preferenciais;PN;ABCD4;Bolsa;B3;",
      "11.111.111/0001-11;2026-03-31;2;20;CIA ATUAL;Ações Preferenciais;PNA;ABCD5;Bolsa;B3;",
      "22.222.222/0001-22;2026-03-31;1;30;SEM B3;Ações Ordinárias;;EFGH3;Bolsa;B3;",
    ].join("\n"));
    const registry = parseCvmRegistryCsv([
      "CNPJ_CIA;CD_CVM;DENOM_SOCIAL;SIT",
      "11.111.111/0001-11;100;CIA ANTIGA;CANCELADO",
      "11.111.111/0001-11;200;CIA ATUAL;ATIVO",
      "22.222.222/0001-22;300;SEM B3;ATIVO",
      "33.333.333/0001-33;400;CIA SOMENTE B3;ATIVO",
    ].join("\n"));

    const result = buildCompanyUniverse({
      fcaSecurities: fca,
      registryCompanies: registry,
      b3Tickers: new Set(["ABCD3", "ABCD4", "ABCD5", "IJKL3", "IJKL5"]),
      b3ListedCompanies: [{
        issuingCompany: "IJKL",
        cvmCode: "400",
        cnpj: "33333333000133",
        companyName: "CIA SOMENTE B3",
      }],
      today: "2026-08-02",
    });

    expect(result.companies.map((company) => company.ticker)).toEqual([
      "ABCD3",
      "ABCD4",
      "ABCD5",
      "IJKL3",
      "IJKL5",
    ]);
    expect(result.companies.filter((company) => company.ticker.startsWith("ABCD"))
      .every((company) => company.cvmCode === "200")).toBe(true);
    expect(result.companies.find((company) => company.ticker === "ABCD3"))
      .toMatchObject({ shareClass: "ON", fundamentalsEnabled: true });
    expect(result.companies.find((company) => company.ticker === "ABCD4"))
      .toMatchObject({ shareClass: "PN", shareClassDetail: "PN", fundamentalsEnabled: true });
    expect(result.companies.find((company) => company.ticker === "ABCD5"))
      .toMatchObject({ shareClass: "PN", shareClassDetail: "PNA", fundamentalsEnabled: true });
    expect(result.companies.find((company) => company.ticker === "IJKL3"))
      .toMatchObject({ cvmCode: "400", discoverySource: "b3_listed", fundamentalsEnabled: true });
    expect(result.companies.find((company) => company.ticker === "IJKL5"))
      .toMatchObject({ shareClassDetail: "PNA", fundamentalsEnabled: true });
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "TICKER_NOT_FOUND_AT_B3",
      ticker: "EFGH3",
    }));
  });

  it("reconhece somente ações correntes do mercado à vista no arquivo B3", () => {
    const valid = {
      TckrSymb: "BBAS3",
      SgmtNm: "CASH",
      MktNm: "EQUITY-CASH",
      SctyCtgyNm: "SHARES",
      TradgEndDt: "9999-12-31",
    };
    expect(isCurrentB3Share(valid)).toBe(true);
    expect(isCurrentB3Share({ ...valid, SctyCtgyNm: "FUNDS" })).toBe(false);
    expect(isCurrentB3Share({ ...valid, TradgEndDt: "2026-08-01" })).toBe(false);
  });

  it("usa o sufixo do ticker quando o FCA traz a classe histórica incorreta", () => {
    const fca = parseFcaSecuritiesCsv([
      fcaHeader,
      "11.111.111/0001-11;2026-03-31;1;10;CIA TESTE;Ações Preferenciais;PNA;TEST3;Bolsa;B3;",
    ].join("\n"));
    const registry = parseCvmRegistryCsv([
      "CNPJ_CIA;CD_CVM;DENOM_SOCIAL;SIT",
      "11.111.111/0001-11;100;CIA TESTE;ATIVO",
    ].join("\n"));

    const result = buildCompanyUniverse({
      fcaSecurities: fca,
      registryCompanies: registry,
      b3Tickers: new Set(["TEST3"]),
      today: "2026-08-02",
    });

    expect(result.companies).toMatchObject([{
      ticker: "TEST3",
      shareClass: "ON",
      shareClassDetail: "ON",
      fundamentalsEnabled: true,
    }]);
  });
});
