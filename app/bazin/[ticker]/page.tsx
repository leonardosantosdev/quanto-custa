import type { Metadata } from "next";
import Link from "next/link";

import { BazinBreakdown } from "@/components/bazin-breakdown";
import { BazinResultPanel } from "@/components/bazin-result";
import { Disclaimer } from "@/components/disclaimer";
import { MetricCard } from "@/components/metric-card";
import { StockSearch } from "@/components/stock-search";
import { calculateBazinPriceCeiling, DEFAULT_BAZIN_YIELD_PERCENT } from "@/lib/bazin";
import { getBazinStock } from "@/lib/bazin-stocks";
import {
  currencyFormatter,
  formatDateTime,
  formatReferenceDate,
  percentFormatter,
} from "@/lib/formatters";
import { calculatePriceDifference } from "@/lib/graham";
import { normalizeTicker } from "@/lib/stocks";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/bazin/[ticker]">): Promise<Metadata> {
  const { ticker: rawTicker } = await params;
  const ticker = normalizeTicker(rawTicker) ?? "Ação";
  return {
    title: `${ticker}: preço-teto de Bazin`,
    description: `Veja o preço-teto de Bazin de ${ticker}, os proventos dos últimos 12 meses e a cotação considerada.`,
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
          <Link className="primary-link" href="/bazin">
            Pesquisar outra ação
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function BazinStockPage({
  params,
}: PageProps<"/bazin/[ticker]">) {
  const { ticker: rawTicker } = await params;
  const ticker = normalizeTicker(rawTicker) ?? rawTicker.toUpperCase();
  const lookup = await getBazinStock(rawTicker);

  if (lookup.status === "manual") {
    return (
      <main className="inner-page">
        <div className="page-shell">
          <div className="error-card">
            <span className="error-code">{ticker}</span>
            <h1>Proventos automáticos indisponíveis</h1>
            <p>
              {lookup.message} Se você possui o total de proventos por ação, pode usar
              a calculadora manual independente.
            </p>
            <Link className="primary-link" href="/bazin/calculadora">
              Informar proventos
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
  const bazin = calculateBazinPriceCeiling({
    annualProceedsPerShare: stock.netProceedsPerShare,
    minimumYieldPercent: DEFAULT_BAZIN_YIELD_PERCENT,
  });
  const comparison =
    bazin.status === "valid"
      ? calculatePriceDifference({ price: stock.price, grahamNumber: bazin.value })
      : { status: "invalid" as const };
  const explanation =
    bazin.status === "valid" && comparison.status === "valid"
      ? `Com ${currencyFormatter.format(stock.netProceedsPerShare)} por ação em proventos líquidos nos últimos 12 meses e retorno mínimo de ${percentFormatter.format(DEFAULT_BAZIN_YIELD_PERCENT)}%, o preço-teto de ${stock.ticker} é ${currencyFormatter.format(bazin.value)}. A cotação está ${percentFormatter.format(Math.abs(comparison.percentage))}% ${comparison.position === "below" ? "abaixo" : comparison.position === "above" ? "acima" : "no mesmo nível"} desse resultado.`
      : "Não foi possível formar a comparação com os dados disponíveis.";
  const jcpTax = stock.jcpGrossPerShare - stock.jcpNetPerShare;

  return (
    <main className="inner-page">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <Link href="/bazin">Bazin</Link>
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
            <strong>{formatDateTime(stock.updatedAt)}</strong><br />
            Proventos atualizados<br />
            <strong>{formatDateTime(stock.proceedsUpdatedAt)}</strong>
          </p>
        </header>

        <p className="manual-option">
          Prefere informar os valores diretamente?{" "}
          <Link href="/bazin/calculadora">Abrir a calculadora manual</Link>
        </p>

        <BazinResultPanel price={stock.price} result={bazin} />

        <div className="stock-content-grid">
          <div className="content-stack">
            <section className="content-card" aria-labelledby="explicacao-bazin">
              <h2 id="explicacao-bazin">O que o resultado mostra</h2>
              <p className="explanation-text">{explanation}</p>
            </section>

            <section className="content-card" aria-labelledby="dados-bazin">
              <h2 id="dados-bazin">Proventos utilizados</h2>
              <dl className="metric-grid">
                <MetricCard
                  label="Dividendos"
                  value={currencyFormatter.format(stock.dividendsPerShare)}
                  detail="Valor integral por ação"
                />
                <MetricCard
                  label="JCP bruto"
                  value={currencyFormatter.format(stock.jcpGrossPerShare)}
                  detail={`IR estimado: −${currencyFormatter.format(jcpTax)}`}
                />
                <MetricCard
                  label="Proventos líquidos"
                  value={currencyFormatter.format(stock.netProceedsPerShare)}
                  detail={`${stock.eventCount} pagamentos considerados`}
                />
              </dl>
              <p className="asset-class">
                Fonte: B3 · datas-com entre {formatReferenceDate(stock.periodStart)} e{" "}
                {formatReferenceDate(stock.periodEnd)}. JCP considerado líquido de 15% de IR.
              </p>
            </section>

            <section className="content-card" aria-labelledby="memoria-bazin">
              <h2 id="memoria-bazin">Memória do cálculo</h2>
              <BazinBreakdown result={bazin} />
            </section>
          </div>

          <aside className="content-card side-card" aria-labelledby="limitacoes-bazin">
            <h2 id="limitacoes-bazin">Limitações importantes</h2>
            <ul className="limitations-list">
              <li>O cálculo olha para pagamentos passados, não garante proventos futuros.</li>
              <li>Proventos extraordinários podem elevar o preço-teto temporariamente.</li>
              <li>Regularidade, endividamento e qualidade do negócio exigem análise adicional.</li>
              <li>A referência de 6% pode não refletir seu custo de oportunidade.</li>
              <li>O resultado não é uma recomendação de investimento.</li>
            </ul>
            <Disclaimer />
          </aside>
        </div>

        <section className="new-search" aria-labelledby="nova-pesquisa-bazin">
          <h2 id="nova-pesquisa-bazin">Pesquisar outra ação</h2>
          <StockSearch method="bazin" />
        </section>
      </div>
    </main>
  );
}
