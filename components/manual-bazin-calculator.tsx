"use client";

import { useState, type FormEvent } from "react";

import { BazinBreakdown } from "@/components/bazin-breakdown";
import { BazinResultPanel } from "@/components/bazin-result";
import { Disclaimer } from "@/components/disclaimer";
import { MetricCard } from "@/components/metric-card";
import {
  calculateBazinPriceCeiling,
  DEFAULT_BAZIN_YIELD_PERCENT,
} from "@/lib/bazin";
import { currencyFormatter, percentFormatter } from "@/lib/formatters";

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

interface ManualBazinValues {
  annualProceedsPerShare: number;
  minimumYieldPercent: number;
  price: number | null;
}

export function ManualBazinCalculator() {
  const [proceedsInput, setProceedsInput] = useState("");
  const [yieldInput, setYieldInput] = useState(String(DEFAULT_BAZIN_YIELD_PERCENT));
  const [priceInput, setPriceInput] = useState("");
  const [values, setValues] = useState<ManualBazinValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearResult() {
    setValues(null);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const annualProceedsPerShare = parseDecimal(proceedsInput);
    const minimumYieldPercent = parseDecimal(yieldInput);
    const price = priceInput.trim() ? parseDecimal(priceInput) : null;
    if (
      annualProceedsPerShare === null ||
      minimumYieldPercent === null ||
      (priceInput.trim() && price === null)
    ) {
      setValues(null);
      setError("Informe valores numéricos válidos. Você pode usar vírgula ou ponto.");
      return;
    }
    if (price !== null && price < 0) {
      setValues(null);
      setError("A cotação opcional não pode ser negativa.");
      return;
    }
    setError(null);
    setValues({ annualProceedsPerShare, minimumYieldPercent, price });
  }

  const result = values ? calculateBazinPriceCeiling(values) : null;

  return (
    <>
      <section className="manual-card" aria-labelledby="calculo-bazin-manual">
        <div className="manual-card-heading">
          <div>
            <span className="manual-eyebrow">Preenchimento manual</span>
            <h2 id="calculo-bazin-manual">Informe os proventos e o retorno mínimo</h2>
          </div>
        </div>
        <p className="manual-intro">
          Some os dividendos e o JCP líquido recebidos por ação nos últimos 12 meses.
          A cotação é opcional e serve somente para comparar com o preço-teto.
        </p>
        <form className="manual-form bazin-manual-form" onSubmit={handleSubmit}>
          <label>
            <span>Proventos por ação</span>
            <small>Dividendos + JCP líquido dos últimos 12 meses</small>
            <div className="manual-input-wrap">
              <span>R$</span>
              <input
                value={proceedsInput}
                onChange={(event) => {
                  setProceedsInput(event.target.value);
                  clearResult();
                }}
                inputMode="decimal"
                placeholder="Ex.: 1,20"
                required
              />
            </div>
          </label>
          <label>
            <span>Retorno mínimo</span>
            <small>6% é a referência tradicional do método</small>
            <div className="manual-input-wrap manual-input-suffix">
              <input
                value={yieldInput}
                onChange={(event) => {
                  setYieldInput(event.target.value);
                  clearResult();
                }}
                inputMode="decimal"
                required
              />
              <span>%</span>
            </div>
          </label>
          <label>
            <span>Cotação atual</span>
            <small>Opcional, para calcular a diferença</small>
            <div className="manual-input-wrap">
              <span>R$</span>
              <input
                value={priceInput}
                onChange={(event) => {
                  setPriceInput(event.target.value);
                  clearResult();
                }}
                inputMode="decimal"
                placeholder="Ex.: 25,00"
              />
            </div>
          </label>
          <button className="primary-link manual-submit" type="submit">
            Calcular
          </button>
        </form>
        <p className="manual-privacy">
          Os valores são usados somente nesta página e não ficam salvos.
        </p>
        {error ? <p className="manual-error" role="alert">{error}</p> : null}
      </section>

      {values && result ? (
        <>
          <BazinResultPanel price={values.price} result={result} />
          <div className="manual-content-grid">
            <div className="content-stack">
              <section className="content-card" aria-labelledby="dados-bazin-manuais">
                <h2 id="dados-bazin-manuais">Dados utilizados</h2>
                <dl className="metric-grid">
                  <MetricCard
                    label="Proventos em 12 meses"
                    value={currencyFormatter.format(values.annualProceedsPerShare)}
                    detail="Valor informado por você"
                  />
                  <MetricCard
                    label="Retorno mínimo"
                    value={`${percentFormatter.format(values.minimumYieldPercent)}%`}
                    detail="Taxa informada por você"
                  />
                  <MetricCard
                    label="Cotação"
                    value={
                      values.price === null
                        ? "Não informada"
                        : currencyFormatter.format(values.price)
                    }
                    detail="Comparação opcional"
                  />
                </dl>
              </section>
              <section className="content-card" aria-labelledby="memoria-bazin-manual">
                <h2 id="memoria-bazin-manual">Memória do cálculo</h2>
                <BazinBreakdown result={result} />
              </section>
            </div>
            <aside className="content-card side-card" aria-labelledby="limites-bazin-manual">
              <h2 id="limites-bazin-manual">Antes de interpretar</h2>
              <ul className="limitations-list">
                <li>Use proventos referentes à mesma classe de ação.</li>
                <li>Proventos extraordinários podem distorcer os últimos 12 meses.</li>
                <li>O método não avalia a sustentabilidade dos pagamentos futuros.</li>
                <li>Consistência, dívida e qualidade do negócio exigem análise adicional.</li>
                <li>O resultado não é uma recomendação de investimento.</li>
              </ul>
              <Disclaimer variant="bazin" />
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
