import type { Metadata } from "next";
import Link from "next/link";

import { FixedIncomeCalculator } from "@/components/fixed-income-calculator";
import { BCB_CDI_SOURCE_URL, getLatestCdiReference } from "@/lib/cdi";

export const metadata: Metadata = {
  title: "Comparador de renda fixa",
  description:
    "Compare CDB, LCI e LCA pelo resultado líquido, considerando CDI, prazo e tributação.",
};

export default async function FixedIncomePage() {
  const cdiReference = await getLatestCdiReference();
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>Renda fixa</span>
        </nav>
        <header className="manual-page-header">
          <p className="eyebrow">Comparador de renda fixa</p>
          <h1>Compare o que realmente chega ao resgate</h1>
          <p>
            Coloque um produto tributável e um isento lado a lado. A ferramenta
            separa rendimento bruto, imposto, lucro líquido e taxa equivalente.
          </p>
        </header>
        <FixedIncomeCalculator cdiReference={cdiReference} />
        <p className="manual-source-note">
          CDI anual: série 4389 do{" "}
          <a href={BCB_CDI_SOURCE_URL} target="_blank" rel="noreferrer">
            Banco Central do Brasil
          </a>. Regras tributárias devem ser confirmadas antes de investir.
        </p>
        <div className="method-link-wrap">
          <Link className="text-link" href="/metodologia/renda-fixa">
            Entenda as premissas do comparador <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
