"use client";

import { useState, type FormEvent } from "react";

import { Disclaimer } from "@/components/disclaimer";
import { MetricCard } from "@/components/metric-card";
import {
  calculateFinancialIndependence,
  type FinancialIndependenceInput,
} from "@/lib/financial-independence";
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

function formatAge(age: number | null): string {
  if (age === null) return "Não atingida até 120 anos";
  let years = Math.floor(age);
  let months = Math.round((age - years) * 12);
  if (months === 12) {
    years += 1;
    months = 0;
  }
  if (months === 0) return `${years} anos`;
  return `${years} anos e ${months} ${months === 1 ? "mês" : "meses"}`;
}

export function FinancialIndependenceCalculator() {
  const [currentAgeInput, setCurrentAgeInput] = useState("");
  const [targetAgeInput, setTargetAgeInput] = useState("60");
  const [assetsInput, setAssetsInput] = useState("");
  const [contributionInput, setContributionInput] = useState("");
  const [incomeInput, setIncomeInput] = useState("");
  const [returnInput, setReturnInput] = useState("8");
  const [inflationInput, setInflationInput] = useState("4");
  const [withdrawalInput, setWithdrawalInput] = useState("4");
  const [values, setValues] = useState<FinancialIndependenceInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearResult() {
    setValues(null);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = [
      currentAgeInput,
      targetAgeInput,
      assetsInput,
      contributionInput,
      incomeInput,
      returnInput,
      inflationInput,
      withdrawalInput,
    ].map(parseDecimal);
    if (parsed.some((value) => value === null)) {
      setValues(null);
      setError("Preencha todos os campos com números válidos.");
      return;
    }
    const nextValues: FinancialIndependenceInput = {
      currentAge: parsed[0] as number,
      targetAge: parsed[1] as number,
      currentAssets: parsed[2] as number,
      monthlyContribution: parsed[3] as number,
      desiredMonthlyIncome: parsed[4] as number,
      nominalAnnualReturnPercent: parsed[5] as number,
      annualInflationPercent: parsed[6] as number,
      annualWithdrawalRatePercent: parsed[7] as number,
    };
    const result = calculateFinancialIndependence(nextValues);
    if (result.status === "invalid") {
      setValues(null);
      setError(result.message);
      return;
    }
    setError(null);
    setValues(nextValues);
  }

  const result = values ? calculateFinancialIndependence(values) : null;
  const progress =
    result?.status === "valid"
      ? Math.min(100, (result.projectedAssetsAtTargetAge / result.targetAssets) * 100)
      : 0;

  const fields = {
    currentAge: (value: string) => {
      setCurrentAgeInput(value);
      clearResult();
    },
    targetAge: (value: string) => {
      setTargetAgeInput(value);
      clearResult();
    },
    assets: (value: string) => {
      setAssetsInput(value);
      clearResult();
    },
    contribution: (value: string) => {
      setContributionInput(value);
      clearResult();
    },
    income: (value: string) => {
      setIncomeInput(value);
      clearResult();
    },
    returnRate: (value: string) => {
      setReturnInput(value);
      clearResult();
    },
    inflation: (value: string) => {
      setInflationInput(value);
      clearResult();
    },
    withdrawal: (value: string) => {
      setWithdrawalInput(value);
      clearResult();
    },
  };

  return (
    <>
      <section className="manual-card" aria-labelledby="calculo-independencia">
        <div className="manual-card-heading">
          <div>
            <span className="manual-eyebrow">Planejamento em valores de hoje</span>
            <h2 id="calculo-independencia">Defina sua meta e suas premissas</h2>
          </div>
        </div>
        <p className="manual-intro">
          A projeção desconta a inflação e assume que o aporte mensal acompanha o
          poder de compra. Todas as taxas são premissas editáveis, não garantias.
        </p>
        <form className="independence-form" onSubmit={handleSubmit}>
          <fieldset className="independence-fieldset">
            <legend>Sua situação e sua meta</legend>
            <div className="independence-fields-grid">
              <label>
                <span>Idade atual</span>
                <small>Idade em anos completos</small>
                <div className="manual-input-wrap manual-input-suffix">
                  <input value={currentAgeInput} onChange={(event) => fields.currentAge(event.target.value)} inputMode="numeric" placeholder="Ex.: 30" required />
                  <span>anos</span>
                </div>
              </label>
              <label>
                <span>Idade desejada</span>
                <small>Quando gostaria de atingir a meta</small>
                <div className="manual-input-wrap manual-input-suffix">
                  <input value={targetAgeInput} onChange={(event) => fields.targetAge(event.target.value)} inputMode="numeric" required />
                  <span>anos</span>
                </div>
              </label>
              <label>
                <span>Patrimônio atual</span>
                <small>Recursos já destinados à meta</small>
                <div className="manual-input-wrap">
                  <span>R$</span>
                  <input value={assetsInput} onChange={(event) => fields.assets(event.target.value)} inputMode="decimal" placeholder="Ex.: 50.000,00" required />
                </div>
              </label>
              <label>
                <span>Aporte mensal</span>
                <small>Em poder de compra de hoje</small>
                <div className="manual-input-wrap">
                  <span>R$</span>
                  <input value={contributionInput} onChange={(event) => fields.contribution(event.target.value)} inputMode="decimal" placeholder="Ex.: 1.500,00" required />
                </div>
              </label>
              <label className="independence-wide-field">
                <span>Renda mensal desejada</span>
                <small>Valor mensal em poder de compra de hoje</small>
                <div className="manual-input-wrap">
                  <span>R$</span>
                  <input value={incomeInput} onChange={(event) => fields.income(event.target.value)} inputMode="decimal" placeholder="Ex.: 5.000,00" required />
                </div>
              </label>
            </div>
          </fieldset>

          <fieldset className="independence-fieldset">
            <legend>Premissas financeiras</legend>
            <div className="independence-fields-grid independence-rates-grid">
              <label>
                <span>Rentabilidade esperada</span>
                <small>Taxa nominal efetiva anual</small>
                <div className="manual-input-wrap manual-input-suffix">
                  <input value={returnInput} onChange={(event) => fields.returnRate(event.target.value)} inputMode="decimal" required />
                  <span>% a.a.</span>
                </div>
              </label>
              <label>
                <span>Inflação esperada</span>
                <small>Usada para obter o retorno real</small>
                <div className="manual-input-wrap manual-input-suffix">
                  <input value={inflationInput} onChange={(event) => fields.inflation(event.target.value)} inputMode="decimal" required />
                  <span>% a.a.</span>
                </div>
              </label>
              <label>
                <span>Taxa de retirada</span>
                <small>Parcela anual do patrimônio usada como renda</small>
                <div className="manual-input-wrap manual-input-suffix">
                  <input value={withdrawalInput} onChange={(event) => fields.withdrawal(event.target.value)} inputMode="decimal" required />
                  <span>% a.a.</span>
                </div>
              </label>
            </div>
          </fieldset>
          <button className="primary-link independence-submit" type="submit">
            Calcular independência financeira
          </button>
        </form>
        {error ? <p className="manual-error" role="alert">{error}</p> : null}
      </section>

      {values && result?.status === "valid" ? (
        <>
          <section className="comparison-highlight independence-highlight" aria-live="polite">
            <span className="result-label">Idade estimada para atingir a meta</span>
            <h2>{formatAge(result.goalAge)}</h2>
            <p>
              {result.targetReached
                ? `Pelo plano informado, a meta já terá sido alcançada aos ${values.targetAge} anos.`
                : `Aos ${values.targetAge} anos, a projeção alcança ${numberFormatter.format(progress)}% da meta.`}
            </p>
            <div className="independence-progress" aria-label={`${numberFormatter.format(progress)}% da meta`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </section>

          <section className="result-panel manual-result-panel" aria-labelledby="resultado-independencia">
            <div className="result-primary">
              <span className="result-label">Patrimônio necessário</span>
              <strong className="result-value" id="resultado-independencia">
                {currencyFormatter.format(result.targetAssets)}
              </strong>
              <span className="result-caption">Em poder de compra de hoje</span>
            </div>
            <div className="result-secondary">
              <span className="result-label">Patrimônio aos {values.targetAge}</span>
              <strong className="result-value">
                {currencyFormatter.format(result.projectedAssetsAtTargetAge)}
              </strong>
              <span className="result-caption">Com o plano informado</span>
            </div>
            <div className="result-secondary">
              <span className="result-label">Renda possível aos {values.targetAge}</span>
              <strong className="result-value">
                {currencyFormatter.format(result.projectedIncomeAtTargetAge)}
              </strong>
              <span className="result-caption">Por mês, pela taxa de retirada</span>
            </div>
          </section>

          <div className="manual-content-grid">
            <div className="content-stack">
              <section className="content-card" aria-labelledby="plano-independencia">
                <h2 id="plano-independencia">O que seria necessário</h2>
                <dl className="metric-grid">
                  <MetricCard label="Aporte atual" value={currencyFormatter.format(values.monthlyContribution)} detail="Informado por você" />
                  <MetricCard label="Aporte necessário" value={currencyFormatter.format(result.requiredMonthlyContribution)} detail={`Para alcançar aos ${values.targetAge} anos`} />
                  <MetricCard label="Retorno real" value={`${numberFormatter.format(result.realAnnualReturnPercent)}% a.a.`} detail="Rentabilidade descontada da inflação" />
                </dl>
              </section>
              <section className="content-card" aria-labelledby="composicao-independencia">
                <h2 id="composicao-independencia">Composição na idade escolhida</h2>
                <dl className="metric-grid">
                  <MetricCard label="Patrimônio + aportes" value={currencyFormatter.format(result.totalContributedAtTargetAge)} detail="Valores reais contribuídos" />
                  <MetricCard label="Rendimentos reais" value={currencyFormatter.format(result.investmentGrowthAtTargetAge)} detail="Crescimento acima da inflação" />
                  <MetricCard label="Prazo" value={`${result.monthsToTargetAge / 12} anos`} detail={`${result.monthsToTargetAge} meses`} />
                </dl>
              </section>
              <section className="content-card" aria-labelledby="formula-independencia">
                <h2 id="formula-independencia">Memória do cálculo</h2>
                <div className="formula-breakdown">
                  <div><span>Patrimônio necessário</span> = renda mensal × 12 ÷ taxa de retirada</div>
                  <div><span>Retorno real</span> = (1 + retorno nominal) ÷ (1 + inflação) − 1</div>
                  <div><span>Aportes</span> = realizados no fim de cada mês e corrigidos pela inflação</div>
                </div>
              </section>
            </div>
            <aside className="content-card side-card" aria-labelledby="limites-independencia">
              <h2 id="limites-independencia">Limitações importantes</h2>
              <ul className="limitations-list">
                <li>Rentabilidade, inflação e retirada variam ao longo do tempo.</li>
                <li>A projeção pressupõe aportes regulares corrigidos pela inflação.</li>
                <li>Impostos, taxas, previdência pública e outras rendas não entram.</li>
                <li>A taxa de retirada não garante que o patrimônio dure indefinidamente.</li>
                <li>O resultado é educacional e não constitui recomendação.</li>
              </ul>
              <Disclaimer variant="financial-independence" />
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
