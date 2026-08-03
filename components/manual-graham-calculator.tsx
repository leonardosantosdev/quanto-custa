"use client";

import { useState, type FormEvent } from "react";

import { Disclaimer } from "@/components/disclaimer";
import { FormulaBreakdown } from "@/components/formula-breakdown";
import { MetricCard } from "@/components/metric-card";
import { currencyFormatter } from "@/lib/formatters";
import { calculateGrahamNumber } from "@/lib/graham";

interface ManualValues {
  eps: number;
  bookValuePerShare: number;
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ManualGrahamCalculator() {
  const [epsInput, setEpsInput] = useState("");
  const [vpaInput, setVpaInput] = useState("");
  const [values, setValues] = useState<ManualValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const eps = parseDecimal(epsInput);
    const bookValuePerShare = parseDecimal(vpaInput);

    if (eps === null || bookValuePerShare === null) {
      setValues(null);
      setError("Informe LPA e VPA como números válidos. Você pode usar vírgula ou ponto.");
      return;
    }

    setError(null);
    setValues({ eps, bookValuePerShare });
  }

  const graham = values ? calculateGrahamNumber(values) : null;
  const explanation =
    values && graham
      ? graham.status === "valid"
        ? `Com LPA de ${currencyFormatter.format(values.eps)} e VPA de ${currencyFormatter.format(values.bookValuePerShare)}, a fórmula resulta em ${currencyFormatter.format(graham.value)}.`
        : graham.message
      : null;

  return (
    <>
      <section className="manual-card" aria-labelledby="calculo-manual">
        <div className="manual-card-heading">
          <div>
            <span className="manual-eyebrow">Preenchimento manual</span>
            <h2 id="calculo-manual">Informe o LPA e o VPA</h2>
          </div>
        </div>
        <p className="manual-intro">
          Esta calculadora usa somente os dois valores abaixo. Ela não pesquisa
          uma ação, não consulta cotação e não compara o resultado com o mercado.
        </p>
        <form className="manual-form" onSubmit={handleSubmit}>
          <label>
            <span>LPA</span>
            <small>Lucro por ação dos últimos 12 meses</small>
            <div className="manual-input-wrap">
              <span>R$</span>
              <input
                value={epsInput}
                onChange={(event) => {
                  setEpsInput(event.target.value);
                  setValues(null);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="Ex.: 2,22"
                aria-describedby="manual-privacy"
                required
              />
            </div>
          </label>
          <label>
            <span>VPA</span>
            <small>Valor patrimonial por ação</small>
            <div className="manual-input-wrap">
              <span>R$</span>
              <input
                value={vpaInput}
                onChange={(event) => {
                  setVpaInput(event.target.value);
                  setValues(null);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="Ex.: 18,40"
                aria-describedby="manual-privacy"
                required
              />
            </div>
          </label>
          <button className="primary-link manual-submit" type="submit">
            Calcular
          </button>
        </form>
        <p className="manual-privacy" id="manual-privacy">
          Os valores são usados somente nesta página e não ficam salvos.
        </p>
        {error ? <p className="manual-error" role="alert">{error}</p> : null}
      </section>

      {values && graham ? (
        <>
          <section className="result-panel manual-result-panel" aria-labelledby="resultado-manual">
            {graham.status === "valid" ? (
              <>
                <div className="result-primary">
                  <span className="result-label">Número de Graham</span>
                  <strong className="result-value" id="resultado-manual">
                    {currencyFormatter.format(graham.value)}
                  </strong>
                  <span className="result-caption">Resultado da fórmula</span>
                </div>
                <div className="result-secondary">
                  <span className="result-label">LPA informado</span>
                  <strong className="result-value">
                    {currencyFormatter.format(values.eps)}
                  </strong>
                  <span className="result-caption">Dado manual</span>
                </div>
                <div className="result-secondary">
                  <span className="result-label">VPA informado</span>
                  <strong className="result-value">
                    {currencyFormatter.format(values.bookValuePerShare)}
                  </strong>
                  <span className="result-caption">Dado manual</span>
                </div>
              </>
            ) : (
              <div className="result-invalid">
                <span className="result-label">Resultado do cálculo</span>
                <h2 id="resultado-manual">Número de Graham indisponível</h2>
                <p>{graham.message}</p>
              </div>
            )}
          </section>

          <div className="manual-content-grid">
            <div className="content-stack">
              <section className="content-card" aria-labelledby="explicacao-manual">
                <h2 id="explicacao-manual">O que o resultado mostra</h2>
                <p className="explanation-text">{explanation}</p>
              </section>

              <section className="content-card" aria-labelledby="dados-manuais">
                <h2 id="dados-manuais">Dados utilizados</h2>
                <dl className="metric-grid manual-metric-grid">
                  <MetricCard
                    label="LPA"
                    value={currencyFormatter.format(values.eps)}
                    detail="Valor informado por você"
                  />
                  <MetricCard
                    label="VPA"
                    value={currencyFormatter.format(values.bookValuePerShare)}
                    detail="Valor informado por você"
                  />
                </dl>
              </section>

              <section className="content-card" aria-labelledby="memoria-manual">
                <h2 id="memoria-manual">Memória do cálculo</h2>
                <FormulaBreakdown
                  eps={values.eps}
                  bookValuePerShare={values.bookValuePerShare}
                  result={graham}
                />
              </section>
            </div>

            <aside className="content-card side-card" aria-labelledby="limitacoes-manuais">
              <h2 id="limitacoes-manuais">Antes de interpretar</h2>
              <ul className="limitations-list">
                <li>Confirme o período e a fonte do LPA e do VPA informados.</li>
                <li>Use LPA e VPA referentes à mesma empresa.</li>
                <li>Prejuízo ou patrimônio negativo não geram resultado válido.</li>
                <li>A fórmula não deve ser usada isoladamente.</li>
                <li>O resultado não é uma recomendação de investimento.</li>
              </ul>
              <Disclaimer variant="graham" />
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
