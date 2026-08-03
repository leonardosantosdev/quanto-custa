import type { Metadata } from "next";
import Link from "next/link";

import { ManualBazinCalculator } from "@/components/manual-bazin-calculator";

export const metadata: Metadata = {
  title: "Calculadora manual de Bazin",
  description:
    "Calcule o preço-teto de Bazin informando proventos por ação e retorno mínimo, sem pesquisar ticker.",
};

export default function ManualBazinPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <Link href="/bazin">Bazin</Link>
          <span aria-hidden="true">/</span>
          <span>Calculadora manual</span>
        </nav>

        <header className="manual-page-header">
          <p className="eyebrow">Calculadora manual</p>
          <h1>Calcule diretamente com seus proventos</h1>
          <p>
            Esta opção é independente da pesquisa de ações. Você informa os proventos
            por ação, o retorno mínimo e, se quiser, uma cotação para comparação.
          </p>
        </header>

        <div className="calculation-mode-switch" aria-label="Forma de cálculo">
          <Link href="/bazin#calcular">Pesquisar uma ação</Link>
          <span aria-current="page">Informar proventos</span>
        </div>

        <ManualBazinCalculator />

        <div className="method-link-wrap">
          <Link className="text-link" href="/metodologia/bazin">
            Entenda a metodologia de Bazin <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
