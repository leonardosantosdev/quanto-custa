import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Metodologias",
  description:
    "Escolha uma metodologia para entender a fórmula, os dados e as limitações de cada calculadora.",
};

const methods = [
  {
    number: "01",
    title: "Número de Graham",
    description:
      "Entenda como lucro e patrimônio por ação formam uma referência conservadora de avaliação.",
    href: "/metodologia/graham",
  },
  {
    number: "02",
    title: "Preço-teto de Bazin",
    description:
      "Veja como os proventos dos últimos 12 meses são relacionados ao retorno mínimo desejado.",
    href: "/metodologia/bazin",
  },
  {
    number: "03",
    title: "Juros compostos",
    description:
      "Conheça a capitalização mensal, a conversão de taxas e a convenção usada para os aportes.",
    href: "/metodologia/juros-compostos",
  },
  {
    number: "04",
    title: "Comparador de renda fixa",
    description:
      "Entenda como CDI, prazo e tributação são transformados em um resultado líquido comparável.",
    href: "/metodologia/renda-fixa",
  },
];

export default function MethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>Metodologias</span>
        </nav>

        <header className="methodology-header">
          <p className="eyebrow">Metodologias</p>
          <h1 className="page-title">Entenda cada cálculo separadamente</h1>
          <p className="methodology-lead">
            Cada ferramenta parte de uma pergunta diferente. Escolha a metodologia
            para conhecer a fórmula, os dados utilizados e o que o resultado não diz.
          </p>
        </header>

        <section className="intro-grid methodology-cards" aria-label="Metodologias disponíveis">
          {methods.map((method) => (
            <article className="intro-card" key={method.href}>
              <span className="step-number">{method.number}</span>
              <h2>{method.title}</h2>
              <p>{method.description}</p>
              <Link className="text-link" href={method.href}>
                Ler metodologia <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
