import type { Metadata } from "next";
import Link from "next/link";

import { Disclaimer } from "@/components/disclaimer";
import { FormulaBreakdown } from "@/components/formula-breakdown";
import { GrahamResultPanel } from "@/components/graham-result";
import { MetricCard } from "@/components/metric-card";
import { StockSearch } from "@/components/stock-search";
import { DEMO_STOCKS } from "@/data/demo/stocks";
import {
  currencyFormatter,
  formatComparisonSentence,
  formatDateTime,
  formatReferenceDate,
} from "@/lib/formatters";
import { calculateGrahamNumber, calculatePriceDifference } from "@/lib/graham";
import { getStock, normalizeTicker } from "@/lib/stocks";

export function generateStaticParams() {
  return DEMO_STOCKS.map((stock) => ({ ticker: stock.ticker }));
}

export async function generateMetadata({
  params,
}: PageProps<"/acao/[ticker]">): Promise<Metadata> {
  const { ticker: rawTicker } = await params;
  const ticker = normalizeTicker(rawTicker) ?? "Ação";
  return {
    title: `${ticker}: Número de Graham e cotação`,
    description: `Veja o Número de Graham de ${ticker}, a cotação considerada, LPA, VPA, memória do cálculo e limitações da métrica.`,
  };
}

function ErrorState({
  ticker,
  title,
  message,
}: {
  ticker: string;
  title: string;
  message: string;
}) {
  return (
    <main className="inner-page">
      <div className="page-shell">
        <div className="error-card">
          <span className="error-code">{ticker || "AÇÃO"}</span>
          <h1>{title}</h1>
          <p>{message}</p>
          <Link className="primary-link" href="/graham">
            Pesquisar outra ação
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function StockPage({ params }: PageProps<"/acao/[ticker]">) {
  const { ticker: rawTicker } = await params;
  const ticker = normalizeTicker(rawTicker) ?? rawTicker.toUpperCase();
  const lookup = await getStock(rawTicker);

  if (lookup.status === "manual") {
    return (
      <main className="inner-page">
        <div className="page-shell">
          <div className="error-card">
            <span className="error-code">{ticker}</span>
            <h1>Fundamentos automáticos indisponíveis</h1>
            <p>
              {lookup.message} Se você já possui LPA e VPA de uma fonte em que
              confia, pode usar a calculadora manual independente.
            </p>
            <Link className="primary-link" href="/calculadora">
              Preencher LPA e VPA
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (lookup.status !== "success") {
    const title =
      lookup.status === "unsupported"
        ? "Ativo ainda não suportado"
        : lookup.status === "error"
          ? "Consulta indisponível"
          : "Ação não encontrada";
    return <ErrorState ticker={ticker} title={title} message={lookup.message} />;
  }

  const { stock } = lookup;
  const graham = calculateGrahamNumber({
    eps: stock.eps,
    bookValuePerShare: stock.bookValuePerShare,
  });
  const comparison =
    graham.status === "valid"
      ? calculatePriceDifference({ price: stock.price, grahamNumber: graham.value })
      : { status: "invalid" as const };
  const explanation =
    graham.status === "valid"
      ? formatComparisonSentence(stock.ticker, stock.price, graham.value, comparison)
      : `Não foi possível calcular o Número de Graham de ${stock.ticker}. ${graham.message}`;

  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span>{stock.ticker}</span>
        </nav>

        <header className="stock-heading">
          <div className="stock-identity">
            <span className="ticker-block">{stock.ticker}</span>
            <div>
              <h1>{stock.name}</h1>
              <p className="asset-class">{stock.assetClass}</p>
            </div>
          </div>
          <p className="updated-at">
            Cotação atualizada<br />
            <strong>{formatDateTime(stock.updatedAt)}</strong>
            <br />
            Fundamentos: <strong>{formatReferenceDate(stock.referenceDate)}</strong>
            <br />
            Base atualizada: <strong>{formatDateTime(stock.fundamentalsUpdatedAt)}</strong>
          </p>
        </header>

        {stock.source === "demo" ? (
          <p className="data-notice">
            {stock.fallbackFromApi
              ? "A API não respondeu. Dados simulados para desenvolvimento."
              : "Dados de demonstração."}
          </p>
        ) : null}

        <p className="manual-option">
          Prefere informar os valores diretamente?{" "}
          <Link href="/calculadora">
            Abrir a calculadora manual
          </Link>
        </p>

        <GrahamResultPanel price={stock.price} result={graham} />

        <div className="stock-content-grid">
          <div className="content-stack">
            <section className="content-card" aria-labelledby="explicacao">
              <h2 id="explicacao">O que o resultado mostra</h2>
              <p className="explanation-text">{explanation}</p>
            </section>

            <section className="content-card" aria-labelledby="dados">
              <h2 id="dados">Dados utilizados</h2>
              <dl className="metric-grid">
                <MetricCard
                  label="LPA"
                  value={stock.eps === null ? "Indisponível" : currencyFormatter.format(stock.eps)}
                  detail={`Lucro por ação · ref. ${formatReferenceDate(stock.referenceDate)}`}
                />
                <MetricCard
                  label="VPA"
                  value={
                    stock.bookValuePerShare === null
                      ? "Indisponível"
                      : currencyFormatter.format(stock.bookValuePerShare)
                  }
                  detail={`Valor patrimonial por ação · ref. ${formatReferenceDate(stock.referenceDate)}`}
                />
                <MetricCard
                  label="Cotação"
                  value={currencyFormatter.format(stock.price)}
                  detail={`Cotação atualizada em ${formatDateTime(stock.updatedAt)}`}
                />
              </dl>
              <p className="asset-class">
                {stock.source === "cvm" && stock.documentType
                  ? `Fonte: CVM · ${stock.documentType} versão ${stock.documentVersion} · recebido em ${formatReferenceDate(stock.documentReceivedAt)}`
                  : "Fonte: conjunto local de demonstração."}
              </p>
            </section>

            <section className="content-card" aria-labelledby="memoria">
              <h2 id="memoria">Memória do cálculo</h2>
              <FormulaBreakdown
                eps={stock.eps}
                bookValuePerShare={stock.bookValuePerShare}
                result={graham}
              />
            </section>
          </div>

          <aside className="content-card side-card" aria-labelledby="limitacoes">
            <h2 id="limitacoes">Limitações importantes</h2>
            <ul className="limitations-list">
              <li>A fórmula não deve ser usada isoladamente.</li>
              <li>Dados contábeis e cotação podem se referir a períodos diferentes.</li>
              <li>Prejuízo ou patrimônio negativo não geram resultado válido.</li>
              <li>A métrica pode ser inadequada para certos setores e estruturas.</li>
              <li>O resultado não é uma recomendação de investimento.</li>
            </ul>
            <Disclaimer />
          </aside>
        </div>

        <section className="new-search" aria-labelledby="nova-pesquisa">
          <h2 id="nova-pesquisa">Pesquisar outra ação</h2>
          <StockSearch />
        </section>
      </div>
    </main>
  );
}
