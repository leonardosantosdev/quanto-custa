import type { Metadata } from "next";
import Link from "next/link";

import { StockSearch } from "@/components/stock-search";
import { ValuationMethodSwitch } from "@/components/valuation-method-switch";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Preço-teto de Bazin",
  description:
    "Calcule o preço-teto de Bazin de ações da B3 com proventos automáticos ou valores informados manualmente.",
};

export default function BazinHome() {
  return (
    <main>
      <section className="hero-section bazin-hero">
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <ValuationMethodSwitch active="bazin" />
            <p className="eyebrow">Calculadora de Bazin</p>
            <h1>Consulte o preço-teto de Bazin de uma ação</h1>
            <p className="hero-subtitle">
              Use os proventos líquidos dos últimos 12 meses ou informe seus próprios
              valores em uma calculadora independente.
            </p>
            <div className="calculation-entry" id="calcular">
              <div className="calculation-mode-switch" aria-label="Forma de cálculo">
                <span aria-current="page">Pesquisar uma ação</span>
                <Link href="/bazin/calculadora">Informar proventos</Link>
              </div>
              <StockSearch method="bazin" autoFocus />
            </div>
            <p className="search-hint">
              Experimente: <Link href="/bazin/BBAS3">BBAS3</Link>,{" "}
              <Link href="/bazin/PETR4">PETR4</Link>,{" "}
              <Link href="/bazin/ITSA4">ITSA4</Link> ou{" "}
              <Link href="/bazin/TAEE4">TAEE4</Link>.
            </p>
          </div>

          <aside className="formula-preview" aria-label="Resumo da fórmula de Bazin">
            <div className="formula-preview-top">
              <span>Fórmula de Bazin</span>
              <span className="formula-dot" aria-hidden="true" />
            </div>
            <p className="formula-large bazin-formula-large">
              <span>Proventos ÷ 6%</span>
            </p>
            <div className="formula-legend">
              <div>
                <strong>DPA</strong>
                <span>Dividendos + JCP líquido em 12 meses</span>
              </div>
              <div>
                <strong>6%</strong>
                <span>Retorno mínimo tradicional, editável</span>
              </div>
            </div>
            <p className="formula-note">
              Uma referência de preço baseada em renda — não uma recomendação de compra.
            </p>
          </aside>
        </div>
      </section>

      <section className="intro-section" aria-labelledby="entenda-bazin">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">Entenda antes de calcular</p>
            <h2 id="entenda-bazin">O preço máximo para o retorno que você exige</h2>
          </div>
          <div className="intro-grid">
            <article className="intro-card">
              <span className="step-number">01</span>
              <h3>Somamos os proventos</h3>
              <p>
                Consideramos dividendos integrais e JCP líquido por ação cuja data-com
                ocorreu nos últimos 12 meses.
              </p>
            </article>
            <article className="intro-card">
              <span className="step-number">02</span>
              <h3>Aplicamos o retorno mínimo</h3>
              <p>
                A referência tradicional é 6% ao ano. Na calculadora manual, você pode
                escolher outra taxa.
              </p>
            </article>
            <article className="intro-card">
              <span className="step-number">03</span>
              <h3>Mostramos a memória</h3>
              <p>
                O resultado separa dividendos, JCP bruto, imposto estimado e cotação
                considerada.
              </p>
            </article>
          </div>
          <div className="method-link-wrap">
            <Link className="text-link" href="/metodologia#bazin">
              Conheça a metodologia completa <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="education-banner">
        <div className="page-shell education-banner-inner">
          <p><strong>{SITE_CONFIG.name}</strong> é uma ferramenta educacional.</p>
          <p>Nenhum resultado apresentado representa recomendação de compra ou venda.</p>
        </div>
      </section>
    </main>
  );
}
