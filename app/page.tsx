import type { Metadata } from "next";
import Link from "next/link";

import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Conheça ferramentas transparentes para precificar ações e simular o crescimento dos seus investimentos.",
};

const tools = [
  {
    number: "01",
    eyebrow: "Valor da empresa",
    title: "Número de Graham",
    description:
      "Relacione lucro e patrimônio por ação usando dados automáticos da CVM ou valores informados por você.",
    href: "/graham",
    action: "Calcular Graham",
  },
  {
    number: "02",
    eyebrow: "Renda da ação",
    title: "Preço-teto de Bazin",
    description:
      "Use dividendos e JCP dos últimos 12 meses para encontrar uma referência baseada no retorno desejado.",
    href: "/bazin",
    action: "Calcular Bazin",
  },
  {
    number: "03",
    eyebrow: "Crescimento no tempo",
    title: "Juros compostos",
    description:
      "Simule o efeito de um valor inicial, aportes mensais, taxa e prazo sobre o montante acumulado.",
    href: "/juros-compostos",
    action: "Fazer simulação",
  },
  {
    number: "04",
    eyebrow: "Resultado líquido",
    title: "Comparador de renda fixa",
    description:
      "Compare CDB, LCI e LCA considerando percentual do CDI, prazo e Imposto de Renda.",
    href: "/renda-fixa",
    action: "Comparar produtos",
  },
  {
    number: "05",
    eyebrow: "Planejamento de longo prazo",
    title: "Independência financeira",
    description:
      "Transforme sua renda mensal desejada em uma meta de patrimônio, idade e aporte necessário.",
    href: "/independencia-financeira",
    action: "Planejar independência",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero-section home-hero">
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{SITE_CONFIG.description}</p>
            <h1>Entenda quanto custa e quanto pode crescer</h1>
            <p className="hero-subtitle">
              Ferramentas financeiras diretas, com fórmulas abertas, fontes
              identificadas e resultados explicados sem promessas de retorno.
            </p>
            <div className="home-actions">
              <Link className="primary-link" href="#ferramentas">
                Explorar calculadoras
              </Link>
              <Link className="text-link" href="/metodologia">
                Conhecer metodologias <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <aside className="formula-preview home-overview" aria-label="Recursos do site">
            <div className="formula-preview-top">
              <span>Quanto Custa</span>
              <span className="formula-dot" aria-hidden="true" />
            </div>
            <h2>Uma ferramenta para cada pergunta</h2>
            <div className="home-summary-list">
              <div><strong>Preço</strong><span>O que lucro e patrimônio sugerem?</span></div>
              <div><strong>Renda</strong><span>Qual preço atende ao retorno desejado?</span></div>
              <div><strong>Tempo</strong><span>Como juros e aportes formam patrimônio?</span></div>
              <div><strong>Líquido</strong><span>Qual produto deixa mais dinheiro no resgate?</span></div>
              <div><strong>Meta</strong><span>Quando o patrimônio pode sustentar sua renda?</span></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="intro-section" id="ferramentas" aria-labelledby="titulo-ferramentas">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">Ferramentas disponíveis</p>
            <h2 id="titulo-ferramentas">Escolha o cálculo que responde à sua pergunta</h2>
          </div>
          <div className="intro-grid methodology-cards tool-cards">
            {tools.map((tool) => (
              <article className="intro-card" key={tool.href}>
                <span className="step-number">{tool.number} · {tool.eyebrow}</span>
                <h2>{tool.title}</h2>
                <p>{tool.description}</p>
                <Link className="primary-link tool-card-action" href={tool.href}>
                  {tool.action}
                </Link>
              </article>
            ))}
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
