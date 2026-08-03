import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";
import { BCB_CDI_SOURCE_URL } from "@/lib/cdi";

export const metadata: Metadata = {
  title: "Metodologia do comparador de renda fixa",
  description:
    "Entenda como o comparador projeta CDI, rendimento, tributação e equivalência líquida.",
};

export default function FixedIncomeMethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/metodologia">Metodologias</Link>
          <span aria-hidden="true">/</span>
          <span>Renda fixa</span>
        </nav>
        <header className="methodology-header">
          <p className="eyebrow">Comparador de renda fixa</p>
          <h1 className="page-title">Do percentual anunciado ao valor líquido</h1>
          <p className="methodology-lead">
            Produtos com percentuais diferentes do CDI não podem ser comparados sem
            considerar prazo e tributação. A ferramenta coloca todos na mesma base.
          </p>
        </header>

        <div className="methodology-layout">
          <nav className="methodology-index" aria-label="Nesta página">
            <a href="#cdi">Percentual do CDI</a>
            <a href="#projecao">Projeção</a>
            <a href="#imposto">Imposto de Renda</a>
            <a href="#equivalencia">Equivalência</a>
            <a href="#limites">Limitações</a>
          </nav>
          <article className="methodology-content">
            <section id="cdi">
              <h2>Como aplicamos um percentual do CDI</h2>
              <p>
                O CDI anual de referência vem da série 4389 do Banco Central. Para
                simular, convertemos essa taxa efetiva anual em uma taxa diária na
                base de 252 dias úteis e aplicamos o percentual contratado.
              </p>
              <div className="method-formula">taxa diária do produto = taxa diária do CDI × percentual</div>
              <p>
                A premissa pode ser editada porque o CDI futuro não é conhecido e
                provavelmente mudará durante o investimento.
              </p>
            </section>
            <section id="projecao">
              <h2>Projeção até o resgate</h2>
              <p>
                A taxa bruta equivalente é capitalizada pelo prazo em dias corridos.
                A ferramenta considera uma aplicação única, sem aportes, resgates
                intermediários ou reinvestimentos externos.
              </p>
            </section>
            <section id="imposto">
              <h2>Imposto de Renda</h2>
              <p>
                Produtos tributáveis usam a tabela regressiva vigente para aplicações
                de renda fixa: a alíquota depende do prazo e incide somente sobre o
                rendimento. Produtos marcados como LCI/LCA são tratados como isentos
                para pessoa física no cenário atual.
              </p>
              <p>
                O comparador exige ao menos 30 dias e não calcula IOF. Regras fiscais
                podem mudar e devem ser confirmadas antes da aplicação.
              </p>
            </section>
            <section id="equivalencia">
              <h2>Taxa equivalente</h2>
              <p>
                Depois de encontrar o valor líquido, buscamos qual percentual do CDI
                um produto com o tratamento tributário oposto precisaria pagar para
                terminar com o mesmo montante.
              </p>
            </section>
            <section id="limites">
              <h2>Limitações</h2>
              <ul>
                <li>O CDI é mantido constante durante toda a projeção.</li>
                <li>Não avaliamos risco de crédito, liquidez, carência ou cobertura.</li>
                <li>Inflação, taxas da instituição e IOF não são descontados.</li>
                <li>Disponibilidade e condições reais variam entre emissores.</li>
              </ul>
              <p>
                Fontes: <a href={BCB_CDI_SOURCE_URL} target="_blank" rel="noreferrer">Banco Central do Brasil</a>
                {" "}e <a href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noreferrer">Receita Federal</a>.
              </p>
              <Disclaimer />
            </section>
          </article>
        </div>
        <div className="method-link-wrap">
          <Link className="primary-link" href="/renda-fixa">Comparar renda fixa</Link>
        </div>
      </div>
    </main>
  );
}
