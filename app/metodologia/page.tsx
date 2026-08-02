import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "Metodologia do Número de Graham",
  description:
    "Entenda a fórmula do Número de Graham, os dados usados, a comparação percentual e as limitações da métrica.",
};

export default function MethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>Metodologia</span>
        </nav>

        <header className="methodology-header">
          <p className="eyebrow">Metodologia</p>
          <h1 className="page-title">Uma fórmula simples, explicada por inteiro</h1>
          <p className="methodology-lead">
            A ferramenta organiza os dados que entram no cálculo e mostra a
            comparação de forma objetiva. Aqui está tudo o que você precisa
            saber para interpretar o resultado.
          </p>
        </header>

        <div className="methodology-layout">
          <nav className="methodology-index" aria-label="Nesta página">
            <a href="#formula">A fórmula</a>
            <a href="#indicadores">LPA e VPA</a>
            <a href="#comparacao">Comparação</a>
            <a href="#sem-resultado">Sem resultado</a>
            <a href="#dados">Origem dos dados</a>
            <a href="#limites">Limitações</a>
          </nav>

          <article className="methodology-content">
            <section id="formula">
              <h2>A fórmula</h2>
              <p>
                O Número de Graham é calculado pela raiz quadrada do produto de
                22,5, o lucro por ação e o valor patrimonial por ação.
              </p>
              <div className="method-formula">√(22,5 × LPA × VPA)</div>
              <p>
                O fator 22,5 combina os limites clássicos de preço/lucro e
                preço/valor patrimonial usados por Benjamin Graham. O resultado
                é uma referência histórica de avaliação, não um preço-alvo.
              </p>
            </section>

            <section id="indicadores">
              <h2>O que significam LPA e VPA</h2>
              <p>
                <strong>LPA</strong> significa lucro por ação: o lucro atribuível
                a cada ação da empresa. <strong>VPA</strong> significa valor
                patrimonial por ação: a parcela do patrimônio líquido atribuível
                a cada ação.
              </p>
              <p>
                A qualidade do resultado depende da qualidade e do período de
                referência desses dois dados.
              </p>
              <p>
                Nos dados automáticos, ambos são calculados no nível da companhia:
                lucro ou patrimônio atribuível aos controladores dividido pelo
                total de ações emitidas. Assim, classes diferentes da mesma empresa
                recebem os mesmos indicadores por ação.
              </p>
            </section>

            <section id="comparacao">
              <h2>Como calculamos a diferença</h2>
              <p>
                A diferença percentual usa o Número de Graham como base:
                <span className="inline-code">
                  (cotação − Número de Graham) ÷ Número de Graham × 100
                </span>
                . Um valor negativo significa que a cotação está abaixo do
                resultado; um valor positivo, acima.
              </p>
              <p>
                Essa descrição é apenas matemática. Ela não classifica uma ação
                como barata, cara ou adequada para compra.
              </p>
            </section>

            <section id="sem-resultado">
              <h2>Por que alguns ativos não produzem resultado</h2>
              <p>
                A raiz só é calculada quando LPA e VPA existem, são números
                válidos e maiores que zero. Empresas com prejuízo, patrimônio
                negativo ou dados ausentes recebem uma explicação em vez de um
                resultado sem sentido financeiro.
              </p>
              <p>
                A calculadora manual é uma ferramenta separada da pesquisa de
                ações. Nela, você informa somente LPA e VPA; não há ticker,
                cotação ou comparação com o mercado. Os valores não são
                verificados nem armazenados.
              </p>
              <p>
                O MVP aceita apenas ações de empresas brasileiras. FIIs, ETFs,
                BDRs, units, índices e outros instrumentos não são suportados.
              </p>
            </section>

            <section id="dados">
              <h2>Origem e atualização dos dados</h2>
              <p>
                As cotações atuais vêm da brapi.dev. LPA e VPA são calculados a
                partir dos arquivos oficiais ITR e DFP publicados pela CVM e
                armazenados separadamente no banco. Por isso a página mostra o
                horário da cotação, a data de referência contábil e a atualização
                do fundamento como datas distintas.
              </p>
              <p>
                A busca também usa o catálogo da brapi.dev para oferecer ações
                que ainda não passaram pela ingestão oficial. Quando não há
                fundamentos seguros, a aplicação informa essa limitação sem
                misturar a ação pesquisada com a calculadora manual.
              </p>
              <p>
                Exemplos locais só são usados quando o modo de demonstração é
                habilitado explicitamente. Esses valores são sempre identificados
                e servem apenas para conhecer o funcionamento da interface.
              </p>
            </section>

            <section id="limites">
              <h2>Limitações e uso educacional</h2>
              <ul>
                <li>A fórmula não avalia dívida, crescimento, governança ou qualidade do negócio.</li>
                <li>Cotação e demonstrações contábeis podem ter datas diferentes.</li>
                <li>Setores financeiros e empresas intensivas em ativos exigem contexto próprio.</li>
                <li>Eventos extraordinários podem distorcer lucro e patrimônio.</li>
              </ul>
              <Disclaimer />
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}
