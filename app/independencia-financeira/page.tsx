import type { Metadata } from "next";
import Link from "next/link";

import { FinancialIndependenceCalculator } from "@/components/financial-independence-calculator";

export const metadata: Metadata = {
  title: "Calculadora de independência financeira",
  description:
    "Calcule o patrimônio, o aporte e o prazo estimados para sustentar uma renda mensal.",
};

export default function FinancialIndependencePage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>Independência financeira</span>
        </nav>
        <header className="manual-page-header">
          <p className="eyebrow">Calculadora de independência financeira</p>
          <h1>Transforme uma meta de renda em um plano de patrimônio</h1>
          <p>
            Descubra quanto precisa acumular, quando o plano atual alcançaria essa
            meta e qual aporte seria necessário para chegar na idade desejada.
          </p>
        </header>
        <FinancialIndependenceCalculator />
        <div className="method-link-wrap">
          <Link className="text-link" href="/metodologia/independencia-financeira">
            Entenda as premissas da projeção <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
