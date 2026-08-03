import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "Metodologia de juros compostos",
  description: "Entenda a capitalização, os aportes e a conversão de taxas da simulação.",
};

export default function CompoundInterestMethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/metodologia">Metodologias</Link>
          <span aria-hidden="true">/</span>
          <span>Juros compostos</span>
        </nav>
        <header className="methodology-header">
          <p className="eyebrow">Juros compostos</p>
          <h1 className="page-title">Juros que também passam a render</h1>
          <p className="methodology-lead">
            A cada período, a taxa incide sobre o capital e sobre os rendimentos já
            acumulados. A calculadora usa meses como unidade de capitalização.
          </p>
        </header>

        <div className="methodology-layout">
          <nav className="methodology-index" aria-label="Nesta página">
            <a href="#formula">A fórmula</a>
            <a href="#aportes">Aportes</a>
            <a href="#taxas">Conversão da taxa</a>
            <a href="#resultado">Resultado</a>
            <a href="#limites">Limitações</a>
          </nav>
          <article className="methodology-content">
            <section id="formula">
              <h2>A fórmula</h2>
              <p>
                O valor inicial cresce pelo fator <span className="inline-code">(1 + i)ⁿ</span>,
                em que <strong>i</strong> é a taxa mensal e <strong>n</strong> é o número de meses.
              </p>
              <div className="method-formula">C × (1 + i)ⁿ</div>
            </section>
            <section id="aportes">
              <h2>Como tratamos os aportes</h2>
              <p>
                A simulação considera um aporte no fim de cada mês. Por isso o primeiro
                aporte rende por um mês a menos que o valor inicial, e o último entra no
                saldo sem juros daquele período.
              </p>
              <div className="method-formula">A × (((1 + i)ⁿ − 1) ÷ i)</div>
              <p>Quando a taxa é zero, apenas somamos o capital inicial e todos os aportes.</p>
            </section>
            <section id="taxas">
              <h2>Conversão da taxa anual</h2>
              <p>
                Uma taxa informada ao ano é tratada como efetiva e convertida para a
                taxa mensal equivalente — não é simplesmente dividida por 12.
              </p>
              <div className="method-formula">i mensal = (1 + i anual)¹⁄¹² − 1</div>
            </section>
            <section id="resultado">
              <h2>O que o resultado separa</h2>
              <p>
                O valor final reúne capital e rendimento. O total investido é o valor
                inicial mais todos os aportes; juros acumulados são a diferença entre
                o montante final e esse total.
              </p>
            </section>
            <section id="limites">
              <h2>Limitações</h2>
              <ul>
                <li>A taxa é mantida constante durante todo o prazo.</li>
                <li>Inflação, impostos e taxas não são descontados.</li>
                <li>A frequência dos aportes é mensal e regular.</li>
                <li>O resultado é uma projeção matemática, não uma promessa de retorno.</li>
              </ul>
              <Disclaimer />
            </section>
          </article>
        </div>
        <div className="method-link-wrap">
          <Link className="primary-link" href="/juros-compostos">Simular juros compostos</Link>
        </div>
      </div>
    </main>
  );
}
