import type { Metadata } from "next";
import Link from "next/link";

import { ManualGrahamCalculator } from "@/components/manual-graham-calculator";

export const metadata: Metadata = {
  title: "Calculadora manual do Número de Graham",
  description:
    "Calcule o Número de Graham informando manualmente o LPA e o VPA, sem pesquisar ticker ou cotação.",
};

export default function ManualCalculatorPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>Calculadora manual</span>
        </nav>

        <header className="manual-page-header">
          <p className="eyebrow">Calculadora manual</p>
          <h1>Calcule diretamente com LPA e VPA</h1>
          <p>
            Esta opção é independente da pesquisa de ações. Você fornece os
            valores e recebe apenas o resultado da fórmula de Graham.
          </p>
        </header>

        <div className="calculation-mode-switch" aria-label="Forma de cálculo">
          <Link href="/graham#calcular">Pesquisar uma ação</Link>
          <span aria-current="page">Preencher LPA e VPA</span>
        </div>

        <ManualGrahamCalculator />

        <div className="method-link-wrap">
          <Link className="text-link" href="/metodologia/graham">
            Entenda a metodologia de Graham <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
