import type { Metadata } from "next";
import Link from "next/link";

import { CompoundInterestCalculator } from "@/components/compound-interest-calculator";

export const metadata: Metadata = {
  title: "Calculadora de juros compostos",
  description:
    "Simule juros compostos com aporte inicial, contribuições mensais, taxa e prazo.",
};

export default function CompoundInterestPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>Juros compostos</span>
        </nav>

        <header className="manual-page-header">
          <p className="eyebrow">Calculadora de juros compostos</p>
          <h1>Veja o efeito do tempo sobre seus investimentos</h1>
          <p>
            Simule o crescimento de um valor inicial com aportes mensais e descubra
            quanto corresponde ao dinheiro investido e aos juros acumulados.
          </p>
        </header>

        <CompoundInterestCalculator />

        <div className="method-link-wrap">
          <Link className="text-link" href="/metodologia/juros-compostos">
            Entenda como calculamos os juros compostos <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
