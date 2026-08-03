import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "Metodologia do Número de Graham",
  description: "Entenda a fórmula de Graham, o cálculo de LPA e VPA e suas limitações.",
};

export default function GrahamMethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/metodologia">Metodologias</Link>
          <span aria-hidden="true">/</span>
          <span>Graham</span>
        </nav>
        <header className="methodology-header">
          <p className="eyebrow">Número de Graham</p>
          <h1 className="page-title">Lucro e patrimônio em uma referência de valor</h1>
          <p className="methodology-lead">
            O método relaciona quanto a empresa lucra e quanto possui de patrimônio
            por ação. O resultado é uma referência histórica, não um preço-alvo.
          </p>
        </header>

        <div className="methodology-layout">
          <nav className="methodology-index" aria-label="Nesta página">
            <a href="#formula">A fórmula</a>
            <a href="#indicadores">LPA e VPA</a>
            <a href="#comparacao">Comparação</a>
            <a href="#dados">Origem dos dados</a>
            <a href="#limites">Limitações</a>
          </nav>
          <article className="methodology-content">
            <section id="formula">
              <h2>A fórmula</h2>
              <p>
                O Número de Graham é a raiz quadrada do produto de 22,5, lucro por
                ação e valor patrimonial por ação.
              </p>
              <div className="method-formula">√(22,5 × LPA × VPA)</div>
              <p>
                O fator 22,5 combina os limites clássicos de preço/lucro e
                preço/valor patrimonial associados a Benjamin Graham.
              </p>
            </section>
            <section id="indicadores">
              <h2>O que significam LPA e VPA</h2>
              <p>
                <strong>LPA</strong> é o lucro atribuível aos controladores dividido
                pelo total de ações emitidas. <strong>VPA</strong> é o patrimônio
                líquido atribuível aos controladores dividido pelo mesmo total.
              </p>
              <p>
                Classes diferentes da mesma empresa recebem os mesmos indicadores
                porque os demonstrativos da CVM são publicados no nível da companhia.
              </p>
            </section>
            <section id="comparacao">
              <h2>Como calculamos a diferença</h2>
              <p>
                A comparação usa o resultado como base: <span className="inline-code">
                  (cotação − Número de Graham) ÷ Número de Graham × 100
                </span>. O texto apenas informa se a cotação está acima ou abaixo;
                não classifica a ação como barata ou cara.
              </p>
            </section>
            <section id="dados">
              <h2>Origem e atualização dos dados</h2>
              <p>
                A cotação vem da brapi.dev. LPA e VPA são calculados a partir dos
                arquivos oficiais ITR e DFP da CVM, com a reapresentação mais recente
                e datas exibidas separadamente na página de resultado.
              </p>
              <p>
                Sem LPA e VPA positivos e seguros, o cálculo automático não é
                publicado. A calculadora manual permanece independente e não salva dados.
              </p>
            </section>
            <section id="limites">
              <h2>Limitações</h2>
              <ul>
                <li>A fórmula não avalia dívida, crescimento, governança ou qualidade.</li>
                <li>Prejuízo ou patrimônio negativo impedem um resultado válido.</li>
                <li>Setores diferentes exigem contexto próprio.</li>
                <li>Eventos extraordinários podem distorcer LPA e VPA.</li>
              </ul>
              <Disclaimer variant="graham" />
            </section>
          </article>
        </div>
        <div className="method-link-wrap">
          <Link className="primary-link" href="/graham#calcular">Calcular Número de Graham</Link>
        </div>
      </div>
    </main>
  );
}
