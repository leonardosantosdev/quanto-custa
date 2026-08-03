"use client";

import { useState, type FormEvent } from "react";

import { Disclaimer } from "@/components/disclaimer";
import { MetricCard } from "@/components/metric-card";
import { StyledSelect } from "@/components/styled-select";
import {
  calculateCompoundInterest,
  type CompoundInterestInput,
  type InterestRatePeriod,
  type InvestmentTermUnit,
} from "@/lib/compound-interest";
import { currencyFormatter, numberFormatter } from "@/lib/formatters";

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function CompoundInterestCalculator() {
  const [initialInput, setInitialInput] = useState("");
  const [contributionInput, setContributionInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [ratePeriod, setRatePeriod] = useState<InterestRatePeriod>("annual");
  const [termInput, setTermInput] = useState("");
  const [termUnit, setTermUnit] = useState<InvestmentTermUnit>("years");
  const [values, setValues] = useState<CompoundInterestInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearResult() {
    setValues(null);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const initialAmount = parseDecimal(initialInput);
    const monthlyContribution = parseDecimal(contributionInput);
    const interestRatePercent = parseDecimal(rateInput);
    const term = parseDecimal(termInput);
    if (
      initialAmount === null ||
      monthlyContribution === null ||
      interestRatePercent === null ||
      term === null
    ) {
      setValues(null);
      setError("Preencha todos os campos com números válidos.");
      return;
    }
    const nextValues = {
      initialAmount,
      monthlyContribution,
      interestRatePercent,
      interestRatePeriod: ratePeriod,
      term,
      termUnit,
    };
    const result = calculateCompoundInterest(nextValues);
    if (result.status === "invalid") {
      setValues(null);
      setError(result.message);
      return;
    }
    setError(null);
    setValues(nextValues);
  }

  const result = values ? calculateCompoundInterest(values) : null;

  return (
    <>
      <section className="manual-card" aria-labelledby="calculo-juros-compostos">
        <div className="manual-card-heading">
          <div>
            <span className="manual-eyebrow">Simulação manual</span>
            <h2 id="calculo-juros-compostos">Informe os valores do investimento</h2>
          </div>
        </div>
        <p className="manual-intro">
          A simulação considera capitalização mensal e aportes realizados no fim de
          cada mês. Nenhum valor é armazenado.
        </p>
        <form className="manual-form compound-interest-form" onSubmit={handleSubmit}>
          <label>
            <span>Valor inicial</span>
            <small>Quantia aplicada no início</small>
            <div className="manual-input-wrap">
              <span>R$</span>
              <input
                value={initialInput}
                onChange={(event) => {
                  setInitialInput(event.target.value);
                  clearResult();
                }}
                inputMode="decimal"
                placeholder="Ex.: 1.000,00"
                required
              />
            </div>
          </label>
          <label>
            <span>Aporte mensal</span>
            <small>Use zero caso não faça aportes</small>
            <div className="manual-input-wrap">
              <span>R$</span>
              <input
                value={contributionInput}
                onChange={(event) => {
                  setContributionInput(event.target.value);
                  clearResult();
                }}
                inputMode="decimal"
                placeholder="Ex.: 500,00"
                required
              />
            </div>
          </label>
          <label>
            <span>Taxa de juros</span>
            <small>Taxa efetiva do período escolhido</small>
            <div className="compound-split-input">
              <div className="manual-input-wrap manual-input-suffix">
                <input
                  value={rateInput}
                  onChange={(event) => {
                    setRateInput(event.target.value);
                    clearResult();
                  }}
                  inputMode="decimal"
                  placeholder="Ex.: 10"
                  required
                />
                <span>%</span>
              </div>
              <StyledSelect
                value={ratePeriod}
                onChange={(value) => {
                  setRatePeriod(value);
                  clearResult();
                }}
                ariaLabel="Período da taxa de juros"
                compact
                options={[
                  { value: "annual", label: "ao ano" },
                  { value: "monthly", label: "ao mês" },
                ]}
              />
            </div>
          </label>
          <label>
            <span>Prazo</span>
            <small>Número inteiro de meses ou anos</small>
            <div className="compound-split-input">
              <div className="manual-input-wrap">
                <input
                  className="compound-number-input"
                  value={termInput}
                  onChange={(event) => {
                    setTermInput(event.target.value);
                    clearResult();
                  }}
                  inputMode="numeric"
                  placeholder="Ex.: 10"
                  required
                />
              </div>
              <StyledSelect
                value={termUnit}
                onChange={(value) => {
                  setTermUnit(value);
                  clearResult();
                }}
                ariaLabel="Unidade do prazo"
                compact
                options={[
                  { value: "years", label: "anos" },
                  { value: "months", label: "meses" },
                ]}
              />
            </div>
          </label>
          <button className="primary-link manual-submit" type="submit">
            Calcular
          </button>
        </form>
        {error ? <p className="manual-error" role="alert">{error}</p> : null}
      </section>

      {values && result?.status === "valid" ? (
        <>
          <section
            className="result-panel manual-result-panel"
            aria-labelledby="resultado-juros-compostos"
          >
            <div className="result-primary">
              <span className="result-label">Valor final</span>
              <strong className="result-value" id="resultado-juros-compostos">
                {currencyFormatter.format(result.finalAmount)}
              </strong>
              <span className="result-caption">Após {result.months} meses</span>
            </div>
            <div className="result-secondary">
              <span className="result-label">Total investido</span>
              <strong className="result-value">
                {currencyFormatter.format(result.totalInvested)}
              </strong>
              <span className="result-caption">Valor inicial + aportes</span>
            </div>
            <div className="result-secondary">
              <span className="result-label">Juros acumulados</span>
              <strong className="result-value">
                {currencyFormatter.format(result.totalInterest)}
              </strong>
              <span className="result-caption">Rendimento bruto estimado</span>
            </div>
          </section>

          <div className="manual-content-grid">
            <div className="content-stack">
              <section className="content-card" aria-labelledby="dados-juros-compostos">
                <h2 id="dados-juros-compostos">Dados utilizados</h2>
                <dl className="metric-grid compound-metric-grid">
                  <MetricCard
                    label="Valor inicial"
                    value={currencyFormatter.format(values.initialAmount)}
                    detail="Aplicado no primeiro mês"
                  />
                  <MetricCard
                    label="Aporte mensal"
                    value={currencyFormatter.format(values.monthlyContribution)}
                    detail="Realizado no fim de cada mês"
                  />
                  <MetricCard
                    label="Taxa mensal equivalente"
                    value={`${numberFormatter.format(result.monthlyRate * 100)}%`}
                    detail={`${numberFormatter.format(values.interestRatePercent)}% ${values.interestRatePeriod === "annual" ? "ao ano" : "ao mês"}`}
                  />
                </dl>
              </section>

              <section className="content-card" aria-labelledby="formula-juros-compostos">
                <h2 id="formula-juros-compostos">Memória do cálculo</h2>
                <div className="formula-breakdown">
                  <div><span>Montante</span> = capital inicial capitalizado + aportes capitalizados</div>
                  <div><span>Fórmula</span> = C × (1 + i)ⁿ + A × (((1 + i)ⁿ − 1) ÷ i)</div>
                  <div><span>Juros</span> = {currencyFormatter.format(result.finalAmount)} − {currencyFormatter.format(result.totalInvested)} = {currencyFormatter.format(result.totalInterest)}</div>
                </div>
              </section>
            </div>

            <aside className="content-card side-card" aria-labelledby="limites-juros-compostos">
              <h2 id="limites-juros-compostos">Antes de interpretar</h2>
              <ul className="limitations-list">
                <li>A taxa é mantida constante durante todo o prazo.</li>
                <li>Aportes são considerados no fim de cada mês.</li>
                <li>Inflação, impostos e taxas não são descontados.</li>
                <li>Rentabilidade passada não garante retorno futuro.</li>
                <li>O resultado é uma simulação, não uma recomendação.</li>
              </ul>
              <Disclaimer variant="compound-interest" />
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
