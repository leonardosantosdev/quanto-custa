import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "Metodologia do preço-teto de Bazin",
  description: "Entenda a fórmula de Bazin, os proventos considerados e suas limitações.",
};

export default function BazinMethodologyPage() {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/metodologia">Metodologias</Link>
          <span aria-hidden="true">/</span>
          <span>Bazin</span>
        </nav>
        <header className="methodology-header">
          <p className="eyebrow">Preço-teto de Bazin</p>
          <h1 className="page-title">Proventos relacionados ao retorno desejado</h1>
          <p className="methodology-lead">
            O método transforma a renda distribuída por ação em uma referência de
            preço. Ele olha para pagamentos passados e não prevê dividendos futuros.
          </p>
        </header>

        <div className="methodology-layout">
          <nav className="methodology-index" aria-label="Nesta página">
            <a href="#formula">A fórmula</a>
            <a href="#proventos">Proventos</a>
            <a href="#ajustes">Ajustes</a>
            <a href="#dados">Origem dos dados</a>
            <a href="#limites">Limitações</a>
          </nav>
          <article className="methodology-content">
            <section id="formula">
              <h2>A fórmula</h2>
              <p>
                O preço-teto divide os proventos por ação dos últimos 12 meses pelo
                retorno mínimo desejado. A referência tradicional é 6% ao ano.
              </p>
              <div className="method-formula">Proventos por ação ÷ 0,06</div>
              <p>
                Na calculadora manual, a taxa pode ser alterada. Quanto maior o
                retorno exigido, menor será o preço-teto calculado.
              </p>
            </section>
            <section id="proventos">
              <h2>Quais proventos entram</h2>
              <p>
                Somamos dividendos integrais e JCP líquido de 15% de imposto cuja
                data-com ocorreu nos últimos 12 meses. Rendimentos de outros tipos
                não são incluídos silenciosamente.
              </p>
              <p>
                Eventos são associados à classe correta da ação pelo ISIN. Assim,
                pagamentos de uma ação ON não são misturados com uma PN diferente.
              </p>
            </section>
            <section id="ajustes">
              <h2>Desdobramentos, bonificações e grupamentos</h2>
              <p>
                Um provento anterior a uma alteração na quantidade de ações é
                convertido para a base acionária atual. Isso evita somar valores por
                ação de bases incompatíveis.
              </p>
            </section>
            <section id="dados">
              <h2>Origem e atualização dos dados</h2>
              <p>
                Os eventos corporativos vêm da B3 e ficam armazenados no Postgres.
                O cron atualiza os emissores em lotes rotativos; a cotação usada na
                comparação vem da brapi.dev.
              </p>
              <p>
                Uma ação sem eventos seguros no período é direcionada ao fluxo manual,
                sem misturar valores informados pelo usuário com o histórico oficial.
              </p>
            </section>
            <section id="limites">
              <h2>Limitações</h2>
              <ul>
                <li>Proventos passados não garantem pagamentos futuros.</li>
                <li>Eventos extraordinários podem elevar o resultado temporariamente.</li>
                <li>A fórmula não avalia dívida nem sustentabilidade da distribuição.</li>
                <li>A taxa de 6% pode não refletir seu custo de oportunidade.</li>
              </ul>
              <Disclaimer />
            </section>
          </article>
        </div>
        <div className="method-link-wrap">
          <Link className="primary-link" href="/bazin#calcular">Calcular preço-teto de Bazin</Link>
        </div>
      </div>
    </main>
  );
}
