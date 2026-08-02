import type { Metadata } from "next";
import Link from "next/link";

import { StockSearch } from "@/components/stock-search";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Consulte o Número de Graham de ações da B3 e entenda, com clareza, os dados usados no cálculo.",
};

export default function Home() {
  return (
    <main>
      <section className="hero-section">
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Calculadora de Graham</p>
            <h1>Consulte o Número de Graham de uma ação</h1>
            <p className="hero-subtitle">
              Escolha entre pesquisar uma ação para usar dados automáticos ou
              informar LPA e VPA diretamente em uma calculadora independente.
            </p>
            <div className="calculation-entry" id="calcular">
              <div className="calculation-mode-switch" aria-label="Forma de cálculo">
                <span aria-current="page">Pesquisar uma ação</span>
                <Link href="/calculadora">Preencher LPA e VPA</Link>
              </div>
              <StockSearch autoFocus />
            </div>
            <p className="search-hint">
              Experimente: <Link href="/acao/BBAS3">BBAS3</Link>,{" "}
              <Link href="/acao/PETR4">PETR4</Link>,{" "}
              <Link href="/acao/ITSA4">ITSA4</Link> ou{" "}
              <Link href="/acao/WEGE3">WEGE3</Link>.
            </p>
          </div>

          <aside className="formula-preview" aria-label="Resumo da fórmula">
            <div className="formula-preview-top">
              <span>Fórmula de Graham</span>
              <span className="formula-dot" aria-hidden="true" />
            </div>
            <p className="formula-large">
              √<span>22,5 × LPA × VPA</span>
            </p>
            <div className="formula-legend">
              <div>
                <strong>LPA</strong>
                <span>Lucro por ação</span>
              </div>
              <div>
                <strong>VPA</strong>
                <span>Valor patrimonial por ação</span>
              </div>
            </div>
            <p className="formula-note">
              Uma referência histórica para relacionar lucro e patrimônio — não um
              preço-alvo.
            </p>
          </aside>
        </div>
      </section>

      <section className="intro-section" aria-labelledby="entenda">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">Entenda antes de comparar</p>
            <h2 id="entenda">Uma referência, não uma resposta pronta</h2>
          </div>
          <div className="intro-grid">
            <article className="intro-card">
              <span className="step-number">01</span>
              <h3>O que é</h3>
              <p>
                O Número de Graham combina lucro e patrimônio por ação para chegar a
                um valor de referência conservador.
              </p>
            </article>
            <article className="intro-card">
              <span className="step-number">02</span>
              <h3>Como usamos</h3>
              <p>
                Colocamos o resultado ao lado da cotação considerada, com a memória
                completa do cálculo e a data dos dados.
              </p>
            </article>
            <article className="intro-card">
              <span className="step-number">03</span>
              <h3>Como interpretar</h3>
              <p>
                Use como ponto de partida educacional. Risco, qualidade do negócio e
                perspectivas exigem uma análise mais ampla.
              </p>
            </article>
          </div>
          <div className="method-link-wrap">
            <Link className="text-link" href="/metodologia">
              Conheça a metodologia completa <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="education-banner">
        <div className="page-shell education-banner-inner">
          <p>
            <strong>{SITE_CONFIG.name}</strong> é uma ferramenta educacional.
          </p>
          <p>
            Nenhum resultado apresentado representa recomendação de compra ou venda.
          </p>
        </div>
      </section>
    </main>
  );
}
