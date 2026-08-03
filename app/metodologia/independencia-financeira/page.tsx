import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "Metodologia de independência financeira",
  description:
    "Entenda como renda, patrimônio, retorno real e taxa de retirada formam a projeção.",
};

export default function FinancialIndependenceMethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/metodologia">Metodologias</Link>
          <span aria-hidden="true">/</span>
          <span>Independência financeira</span>
        </nav>
        <header className="methodology-header">
          <p className="eyebrow">Independência financeira</p>
          <h1 className="page-title">Uma meta de renda traduzida em patrimônio e tempo</h1>
          <p className="methodology-lead">
            A projeção não tenta prever o mercado. Ela mostra o que aconteceria se
            as premissas informadas fossem mantidas ao longo do caminho.
          </p>
        </header>

        <div className="methodology-layout">
          <nav className="methodology-index" aria-label="Nesta página">
            <a href="#meta">Patrimônio necessário</a>
            <a href="#retorno-real">Retorno real</a>
            <a href="#projecao">Projeção</a>
            <a href="#aporte">Aporte necessário</a>
            <a href="#limites">Limitações</a>
          </nav>
          <article className="methodology-content">
            <section id="meta">
              <h2>Patrimônio necessário</h2>
              <p>
                Primeiro transformamos a renda mensal desejada em renda anual. Esse
                valor é dividido pela taxa anual de retirada informada.
              </p>
              <div className="method-formula">patrimônio = renda mensal × 12 ÷ taxa de retirada</div>
              <p>
                A taxa de retirada é uma premissa, não uma garantia de duração do
                patrimônio. Uma taxa menor exige uma reserva maior.
              </p>
            </section>
            <section id="retorno-real">
              <h2>Rentabilidade acima da inflação</h2>
              <p>
                Para apresentar tudo em poder de compra de hoje, descontamos a
                inflação pela relação entre os fatores das duas taxas.
              </p>
              <div className="method-formula">retorno real = (1 + retorno nominal) ÷ (1 + inflação) − 1</div>
              <p>
                Isso é diferente de simplesmente subtrair uma porcentagem da outra.
                Os aportes são tratados como valores reais, corrigidos pela inflação.
              </p>
            </section>
            <section id="projecao">
              <h2>Projeção mensal</h2>
              <p>
                O patrimônio atual rende desde o início. Cada aporte entra no fim do
                mês e passa a render nos meses seguintes. A calculadora repete esse
                processo até a idade escolhida e, separadamente, até alcançar a meta.
              </p>
            </section>
            <section id="aporte">
              <h2>Aporte necessário</h2>
              <p>
                Também resolvemos a fórmula de juros compostos ao contrário para
                encontrar qual aporte mensal alcançaria o patrimônio necessário no
                prazo definido pelo usuário.
              </p>
            </section>
            <section id="limites">
              <h2>Limitações</h2>
              <ul>
                <li>Retorno, inflação e capacidade de aporte não permanecem constantes.</li>
                <li>Impostos, taxas e mudanças de renda não entram automaticamente.</li>
                <li>Previdência pública e outras fontes de renda não são somadas.</li>
                <li>A taxa de retirada não assegura renda perpétua.</li>
              </ul>
              <Disclaimer variant="financial-independence" />
            </section>
          </article>
        </div>
        <div className="method-link-wrap">
          <Link className="primary-link" href="/independencia-financeira">
            Planejar independência financeira
          </Link>
        </div>
      </div>
    </main>
  );
}
