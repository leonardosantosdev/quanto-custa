import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createCronHandler, isAuthorizedCronRequest } from "@/app/api/cron/update-fundamentals/route";
import { calculateTrailingEps } from "@/lib/cvm/calculations/lpa";
import { calculateBookValuePerShare } from "@/lib/cvm/calculations/vpa";
import {
  normalizeCvmCode,
  normalizeMoney,
  parseCvmDate,
  parseCvmNumber,
} from "@/lib/cvm/normalizers";
import { parseCvmCsvFixture } from "@/lib/cvm/parsers/archive";
import {
  decideFundamentalWrite,
  fundamentalHistoryKey,
} from "@/lib/cvm/persistence-policy";
import {
  selectLatestRepresentations,
  shouldReplaceFundamental,
} from "@/lib/cvm/selectors/documents";
import type {
  CvmCapitalRow,
  CvmDocumentBundle,
  CvmDocumentType,
  CvmStatementRow,
  FundamentalCandidate,
  TrackedCompany,
} from "@/lib/cvm/types";

const company: TrackedCompany = {
  ticker: "BBAS3",
  cvmCode: "1023",
  cnpj: "00.000.000/0001-91",
  companyName: "Banco do Brasil S.A.",
  shareClass: "ON",
  isActive: true,
};

function statement(overrides: Partial<CvmStatementRow> = {}): CvmStatementRow {
  return {
    cnpj: "00000000000191",
    cvmCode: "1023",
    referenceDate: "2025-12-31",
    version: 1,
    statementGroup: "DF Consolidado - Demonstração do Resultado",
    currency: "REAL",
    monetaryScale: "MIL",
    exerciseOrder: "ÚLTIMO",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    accountCode: "3.99.01.01",
    accountDescription: "Resultado Básico por Ação ON",
    value: 8,
    fixedAccount: true,
    ...overrides,
  };
}

function capital(overrides: Partial<CvmCapitalRow> = {}): CvmCapitalRow {
  return {
    cnpj: "00000000000191",
    referenceDate: "2025-12-31",
    version: 1,
    companyName: company.companyName,
    issuedOn: 1_000,
    issuedPn: 0,
    issuedTotal: 1_000,
    treasuryOn: 100,
    treasuryPn: 0,
    treasuryTotal: 100,
    ...overrides,
  };
}

function bundle(options: {
  referenceDate?: string;
  documentType?: CvmDocumentType;
  version?: number;
  receivedAt?: string;
  id?: number;
  eps?: number;
  startDate?: string;
  balanceRows?: CvmStatementRow[];
  capital?: CvmCapitalRow | null;
} = {}): CvmDocumentBundle {
  const referenceDate = options.referenceDate ?? "2025-12-31";
  const documentType = options.documentType ?? "DFP";
  const version = options.version ?? 1;
  const startDate = options.startDate ?? `${referenceDate.slice(0, 4)}-01-01`;
  const documentCapital = options.capital === undefined
    ? capital({ referenceDate, version })
    : options.capital;
  const eps = options.eps ?? 8;
  const issuedShares = documentCapital?.issuedTotal ?? 1_000;
  return {
    metadata: {
      cnpj: "00000000000191",
      cvmCode: "1023",
      companyName: company.companyName,
      referenceDate,
      version,
      documentType,
      officialDocumentId: options.id ?? 1,
      receivedAt: options.receivedAt ?? referenceDate,
    },
    incomeRows: [
      statement({
        referenceDate,
        version,
        startDate,
        endDate: referenceDate,
        value: eps,
      }),
      statement({
        referenceDate,
        version,
        startDate,
        endDate: referenceDate,
        accountCode: "3.11.01",
        accountDescription: "Lucro Atribuído aos Controladores",
        value: (eps * issuedShares) / 1_000,
      }),
    ],
    balanceRows:
      options.balanceRows ??
      [
        statement({
          referenceDate,
          version,
          startDate: null,
          endDate: referenceDate,
          accountCode: "2.07.01",
          accountDescription: "Patrimônio Líquido Atribuído ao Controlador",
          value: 18,
        }),
      ],
    capital: documentCapital,
  };
}

function candidate(overrides: Partial<FundamentalCandidate> = {}): FundamentalCandidate {
  return {
    ticker: "BBAS3",
    eps: 8,
    bookValuePerShare: 20,
    referenceDate: "2025-12-31",
    documentType: "DFP",
    documentVersion: 1,
    officialDocumentId: 10,
    documentReceivedAt: "2026-03-01",
    sourceCvmCode: "1023",
    calculationMethod: "fixture-method",
    calculationDetails: {
      epsAccountCode: "3.99.01.01",
      epsPeriods: ["2025-01-01/2025-12-31"],
      equityAccountCodes: ["2.07.01"],
      equityAmount: 18_000,
      outstandingShares: 900,
      shareQuantityScale: 1,
      shareQuantityRule: "reported_capital_quantity",
      monetaryScale: "MIL",
      classRule: "single_issued_share_class",
      statementBasis: "consolidated",
    },
    ...overrides,
  };
}

describe("normalização e fixtures oficiais", () => {
  it("normaliza dinheiro, datas, decimais, ausências e código CVM", () => {
    expect(normalizeMoney(12.5, "REAL", "UNIDADE")).toBe(12.5);
    expect(normalizeMoney(12.5, "REAL", "MIL")).toBe(12_500);
    expect(normalizeMoney(12.5, "USD", "MIL")).toBeNull();
    expect(parseCvmDate("31/12/2025")).toBe("2025-12-31");
    expect(parseCvmDate("31/02/2025")).toBeNull();
    expect(parseCvmNumber("1.234,56")).toBe(1234.56);
    expect(parseCvmNumber("  ")).toBeNull();
    expect(normalizeCvmCode("01.023-0")).toBe("10230");
    expect(normalizeCvmCode("01023")).toBe("1023");
  });

  it("lê cabeçalhos e valores de uma fixture pequena no formato real da CVM", () => {
    const fixture = (name: string) =>
      readFileSync(
        fileURLToPath(new URL(`../../test/fixtures/cvm/${name}`, import.meta.url)),
        "utf8",
      );
    const metadata = parseCvmCsvFixture(
      fixture("itr_cia_aberta_2025.csv"),
      "metadata",
      "ITR",
      [company],
    );
    const income = parseCvmCsvFixture(
      fixture("itr_cia_aberta_DRE_con_2025.csv"),
      "income",
      "ITR",
      [company],
    );
    const balance = parseCvmCsvFixture(
      fixture("itr_cia_aberta_BPP_con_2025.csv"),
      "balance",
      "ITR",
      [company],
    );
    const shares = parseCvmCsvFixture(
      fixture("itr_cia_aberta_composicao_capital_2025.csv"),
      "capital",
      "ITR",
      [company],
    );

    expect(metadata).toMatchObject([{ cvmCode: "1023", version: 2, receivedAt: "2025-11-07" }]);
    expect(income).toMatchObject([
      { accountCode: "3.99.01.01", value: 6.25 },
      { accountCode: "3.99", value: 6.25 },
    ]);
    expect(balance).toMatchObject([{ accountCode: "2.07.01", monetaryScale: "MIL" }]);
    expect(shares).toMatchObject([{ issuedTotal: 2_860_000_000, treasuryTotal: 10_000_000 }]);
  });

  it("aceita DRE e balanço individuais como fallback", () => {
    const income = parseCvmCsvFixture(
      [
        "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA",
        "00.000.000/0001-91;2025-12-31;1;BANCO DO BRASIL S.A.;01023;DF Individual - Demonstração do Resultado;REAL;MIL;ÚLTIMO;2025-01-01;2025-12-31;3.11;Resultado Líquido do Período;8000;S",
      ].join("\n"),
      "income",
      "DFP",
      [company],
    );
    const balance = parseCvmCsvFixture(
      [
        "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA",
        "00.000.000/0001-91;2025-12-31;1;BANCO DO BRASIL S.A.;01023;DF Individual - Balanço Patrimonial Passivo;REAL;MIL;ÚLTIMO;2025-12-31;2.03;Patrimônio Líquido;18000;S",
      ].join("\n"),
      "balance",
      "DFP",
      [company],
    );
    expect(income).toMatchObject([{ accountCode: "3.11", statementGroup: expect.stringContaining("Individual") }]);
    expect(balance).toMatchObject([{ accountCode: "2.03", statementGroup: expect.stringContaining("Individual") }]);
  });

  it("reconhece o lucro do controlador no plano contábil de instituições financeiras", () => {
    const income = parseCvmCsvFixture(
      [
        "CNPJ_CIA;DT_REFER;VERSAO;DENOM_CIA;CD_CVM;GRUPO_DFP;MOEDA;ESCALA_MOEDA;ORDEM_EXERC;DT_INI_EXERC;DT_FIM_EXERC;CD_CONTA;DS_CONTA;VL_CONTA;ST_CONTA_FIXA",
        "00.000.000/0001-91;2025-12-31;1;BANCO DO BRASIL S.A.;01023;DF Consolidado - Demonstração do Resultado;REAL;MIL;ÚLTIMO;2025-01-01;2025-12-31;3.09.01;Atribuído a Sócios da Empresa Controladora;8000;S",
      ].join("\n"),
      "income",
      "DFP",
      [company],
    );

    expect(income).toMatchObject([{
      accountCode: "3.09.01",
      accountDescription: expect.stringContaining("Controladora"),
    }]);
  });
});

describe("seleção de documentos e versões", () => {
  it("escolhe versão 2 e a reapresentação oficial mais recente", () => {
    const first = bundle({ version: 1, receivedAt: "2026-02-01", id: 1 });
    const second = bundle({ version: 2, receivedAt: "2026-03-01", id: 2 });
    expect(selectLatestRepresentations([first, second])).toEqual([second]);
  });

  it("não troca o atual por documento antigo e ignora documento idêntico", () => {
    const current = candidate({ documentVersion: 2, officialDocumentId: 20 });
    const older = candidate({ referenceDate: "2025-09-30", documentType: "ITR" });
    expect(shouldReplaceFundamental(older, current)).toBe(false);
    expect(decideFundamentalWrite(current, current)).toBe("ignore-identical");
  });

  it("recalcula o mesmo documento quando a metodologia muda", () => {
    const current = candidate({ calculationMethod: "legacy_method" });
    const recalculated = candidate({ calculationMethod: "new_method" });
    expect(decideFundamentalWrite(recalculated, current)).toBe("update");
  });
});

describe("LPA", () => {
  it("prioriza a conta padronizada quando uma conta histórica zerada também existe", () => {
    const document = bundle({ eps: 8 });
    document.incomeRows.unshift(statement({
      accountCode: "3.09.01",
      accountDescription: "Atribuído a Sócios da Empresa Controladora",
      value: 0,
    }));

    expect(calculateTrailingEps(document, [])).toMatchObject({
      status: "valid",
      value: 8,
      accountCode: "3.11.01",
    });
  });

  it("divide o lucro anual atribuível ao controlador pelas ações emitidas", () => {
    expect(calculateTrailingEps(bundle({ eps: 9 }), [])).toMatchObject({
      status: "valid",
      value: 9,
      method: "cvm_controller_profit_annual_over_issued_shares",
    });
    expect(calculateTrailingEps(bundle({ eps: -2 }), [])).toMatchObject({
      status: "valid",
      value: -2,
    });
  });

  it("faz a ponte TTM com acumulados, sem somá-los como trimestres isolados", () => {
    const annual = bundle({ referenceDate: "2024-12-31", eps: 8 });
    const comparable = bundle({
      referenceDate: "2024-09-30",
      documentType: "ITR",
      eps: 5,
    });
    const latest = bundle({
      referenceDate: "2025-09-30",
      documentType: "ITR",
      eps: 7,
    });
    const result = calculateTrailingEps(latest, [annual, comparable]);
    expect(result).toMatchObject({
      status: "valid",
      value: 10,
      method: "cvm_controller_profit_ttm_over_issued_shares",
    });
    expect(result.status === "valid" && result.value).not.toBe(20);
  });

  it("calcula pelo lucro mesmo quando a conta de LPA não foi preenchida", () => {
    const withoutReportedEps = (document: CvmDocumentBundle) => {
      document.incomeRows = document.incomeRows.filter(
        (row) => !row.accountCode.startsWith("3.99"),
      );
      return document;
    };
    const largeCapital = capital({
      issuedOn: 10_000_000,
      issuedTotal: 10_000_000,
      treasuryOn: 0,
      treasuryTotal: 0,
    });
    const annual = withoutReportedEps(bundle({
      referenceDate: "2025-12-31",
      eps: 2.4,
      capital: { ...largeCapital, referenceDate: "2025-12-31" },
    }));
    const comparable = withoutReportedEps(bundle({
      referenceDate: "2025-03-31",
      documentType: "ITR",
      eps: 0.6,
      capital: { ...largeCapital, referenceDate: "2025-03-31" },
    }));
    const latest = withoutReportedEps(bundle({
      referenceDate: "2026-03-31",
      documentType: "ITR",
      eps: 0.42,
      capital: { ...largeCapital, referenceDate: "2026-03-31" },
    }));

    const result = calculateTrailingEps(latest, [annual, comparable]);
    expect(result).toMatchObject({
      status: "valid",
      accountCode: "3.11.01",
      method: "cvm_controller_profit_ttm_over_issued_shares",
    });
    expect(result.status === "valid" && result.value).toBeCloseTo(2.22);
  });

  it("retorna indisponível quando falta o período comparável", () => {
    const latest = bundle({ referenceDate: "2025-09-30", documentType: "ITR" });
    expect(calculateTrailingEps(latest, []).status).toBe("unavailable");
  });

  it("usa demonstração individual quando a consolidada não existe", () => {
    const document = bundle({ eps: 8 });
    document.incomeRows = document.incomeRows.map((row) => ({
      ...row,
      statementGroup: "DF Individual - Demonstração do Resultado",
      accountCode: row.accountCode === "3.11.01" ? "3.11" : row.accountCode,
    }));
    document.balanceRows = document.balanceRows.map((row) => ({
      ...row,
      statementGroup: "DF Individual - Balanço Patrimonial Passivo",
      accountCode: "2.03",
      accountDescription: "Patrimônio Líquido",
    }));
    expect(calculateTrailingEps(document, [])).toMatchObject({
      status: "valid",
      value: 8,
      statementBasis: "individual",
    });
    expect(calculateBookValuePerShare(document)).toMatchObject({
      status: "valid",
      value: 18,
      statementBasis: "individual",
    });
  });
});

describe("VPA", () => {
  it("normaliza patrimônio em milhares e usa o total de ações emitidas", () => {
    expect(calculateBookValuePerShare(bundle())).toMatchObject({
      status: "valid",
      value: 18,
      equity: 18_000,
      outstandingShares: 1_000,
    });
  });

  it("aceita patrimônio consolidado menos não controladores", () => {
    const rows = [
      statement({
        startDate: null,
        accountCode: "2.03",
        accountDescription: "Patrimônio Líquido Consolidado",
        value: 20,
      }),
      statement({
        startDate: null,
        accountCode: "2.03.09",
        accountDescription: "Participação dos Acionistas Não Controladores",
        value: 2,
      }),
    ];
    expect(calculateBookValuePerShare(bundle({ balanceRows: rows }))).toMatchObject({
      status: "valid",
      value: 18,
      equityAccountCodes: ["2.03", "2.03.09"],
    });
  });

  it("reconcilia quantidade reportada em milhares com lucro e LPA oficiais", () => {
    const document = bundle({
      eps: 2,
      capital: capital({
        issuedOn: 10,
        issuedTotal: 10,
        treasuryOn: 1,
        treasuryTotal: 1,
      }),
    });
    const profit = document.incomeRows.find((row) => row.accountCode === "3.11.01");
    if (profit) profit.value = 18;
    expect(calculateBookValuePerShare(document)).toMatchObject({
      status: "valid",
      value: 1.8,
      outstandingShares: 10_000,
      shareQuantityScale: 1_000,
    });
  });

  it("preserva patrimônio negativo e rejeita ações zero ou ausentes", () => {
    const negative = bundle({
      balanceRows: [
        statement({
          startDate: null,
          accountCode: "2.07.01",
          accountDescription: "Patrimônio Líquido Atribuído ao Controlador",
          value: -1,
        }),
      ],
    });
    expect(calculateBookValuePerShare(negative)).toMatchObject({
      status: "valid",
      value: -1,
    });
    expect(
      calculateBookValuePerShare(
        bundle({ capital: capital({ issuedTotal: 0, treasuryTotal: 0 }) }),
      ).status,
    ).toBe("unavailable");
    expect(calculateBookValuePerShare(bundle({ capital: null })).status).toBe("unavailable");
  });
});

describe("política de persistência", () => {
  it("atualiza apenas a versão mais nova e produz uma chave histórica idempotente", () => {
    const current = candidate();
    const newer = candidate({ documentVersion: 2, officialDocumentId: 11 });
    const older = candidate({ referenceDate: "2025-09-30", documentType: "ITR" });
    expect(decideFundamentalWrite(newer, current)).toBe("update");
    expect(decideFundamentalWrite(older, current)).toBe("ignore-older");
    const history = new Set([fundamentalHistoryKey(newer), fundamentalHistoryKey(newer)]);
    expect(history.size).toBe(1);
  });

  it("uma falha sem candidato preserva o fundamento anterior", () => {
    const before = candidate();
    const apply = (current: FundamentalCandidate, next?: FundamentalCandidate) =>
      next && decideFundamentalWrite(next, current) === "update" ? next : current;
    expect(apply(before)).toBe(before);
    expect(apply(before, before)).toBe(before);
  });
});

describe("cron protegido", () => {
  const summary = {
    status: "unchanged" as const,
    runId: 1,
    documentsChecked: 4,
    documentsDownloaded: 0,
    companiesProcessed: 4,
    fundamentalsInserted: 0,
    fundamentalsUpdated: 0,
    fundamentalsIgnored: 0,
    fundamentalsRemoved: 0,
    warnings: 0,
    errors: 0,
  };

  it("rejeita segredo ausente ou incorreto e aceita o correto", () => {
    expect(isAuthorizedCronRequest(null, "segredo")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer errado", "segredo")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer segredo", "segredo")).toBe(true);
  });

  it("retorna sucesso autenticado e bloqueia execução concorrente", async () => {
    process.env.CRON_SECRET = "segredo-teste";
    const request = new Request("http://local/api/cron/update-fundamentals", {
      headers: { authorization: "Bearer segredo-teste" },
    });
    const ok = await createCronHandler(async () => summary)(request);
    expect(ok.status).toBe(200);

    const conflict = await createCronHandler(async () => ({
      ...summary,
      status: "already-running",
      runId: null,
    }))(request);
    expect(conflict.status).toBe(409);
    delete process.env.CRON_SECRET;
  });
});
