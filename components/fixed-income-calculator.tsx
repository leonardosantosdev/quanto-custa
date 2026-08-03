"use client";

import { useState, type FormEvent } from "react";

import { Disclaimer } from "@/components/disclaimer";
import { MetricCard } from "@/components/metric-card";
import { StyledSelect } from "@/components/styled-select";
import type { CdiReference } from "@/lib/cdi";
import {
  calculateFixedIncomeComparison,
  type FixedIncomeProductInput,
  type FixedIncomeRateType,
  type TaxTreatment,
} from "@/lib/fixed-income";
import {
  currencyFormatter,
  formatReferenceDate,
  numberFormatter,
  percentFormatter,
} from "@/lib/formatters";

interface ProductFormState {
  taxTreatment: TaxTreatment;
  rateType: FixedIncomeRateType;
  rateInput: string;
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function productName(treatment: TaxTreatment): string {
  return treatment === "regressive" ? "CDB / tributável" : "LCI/LCA / isento";
}

function ProductFields({
  position,
  state,
  onChange,
}: {
  position: "A" | "B";
  state: ProductFormState;
  onChange: (value: ProductFormState) => void;
}) {
  return (
    <fieldset className="fixed-income-product">
      <legend>Produto {position}</legend>
      <label>
        <span>Tratamento tributário</span>
        <small>Escolha o tipo usado na comparação</small>
        <StyledSelect
          value={state.taxTreatment}
          onChange={(taxTreatment) => onChange({ ...state, taxTreatment })}
          ariaLabel={`Tratamento tributário do produto ${position}`}
          options={[
            { value: "regressive", label: "CDB / tributável" },
            { value: "exempt", label: "LCI/LCA / isento" },
          ]}
        />
      </label>
      <label>
        <span>Tipo de rentabilidade</span>
        <small>Percentual do CDI ou taxa prefixada</small>
        <StyledSelect
          value={state.rateType}
          onChange={(rateType) => onChange({ ...state, rateType })}
          ariaLabel={`Tipo de rentabilidade do produto ${position}`}
          options={[
            { value: "cdi", label: "Percentual do CDI" },
            { value: "fixed", label: "Prefixada ao ano" },
          ]}
        />
      </label>
      <label>
        <span>{state.rateType === "cdi" ? "Percentual do CDI" : "Taxa prefixada"}</span>
        <small>{state.rateType === "cdi" ? "Ex.: 110% do CDI" : "Taxa efetiva anual"}</small>
        <div className="manual-input-wrap manual-input-suffix">
          <input
            value={state.rateInput}
            onChange={(event) => onChange({ ...state, rateInput: event.target.value })}
            inputMode="decimal"
            placeholder={state.rateType === "cdi" ? "Ex.: 110" : "Ex.: 12,5"}
            required
          />
          <span>{state.rateType === "cdi" ? "% CDI" : "% a.a."}</span>
        </div>
      </label>
    </fieldset>
  );
}

export function FixedIncomeCalculator({
  cdiReference,
}: {
  cdiReference: CdiReference | null;
}) {
  const [amountInput, setAmountInput] = useState("");
  const [termInput, setTermInput] = useState("365");
  const [cdiInput, setCdiInput] = useState(
    cdiReference ? String(cdiReference.annualRatePercent) : "",
  );
  const [productStates, setProductStates] = useState<
    [ProductFormState, ProductFormState]
  >([
    { taxTreatment: "regressive", rateType: "cdi", rateInput: "110" },
    { taxTreatment: "exempt", rateType: "cdi", rateInput: "90" },
  ]);
  const [values, setValues] = useState<{
    initialAmount: number;
    termDays: number;
    cdiAnnualPercent: number;
    products: [FixedIncomeProductInput, FixedIncomeProductInput];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearResult() {
    setValues(null);
    setError(null);
  }

  function updateProduct(index: 0 | 1, nextState: ProductFormState) {
    setProductStates((current) => {
      const next = [...current] as [ProductFormState, ProductFormState];
      next[index] = nextState;
      return next;
    });
    clearResult();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const initialAmount = parseDecimal(amountInput);
    const termDays = parseDecimal(termInput);
    const cdiAnnualPercent = parseDecimal(cdiInput);
    const rates = productStates.map((product) => parseDecimal(product.rateInput));
    if (
      initialAmount === null ||
      termDays === null ||
      cdiAnnualPercent === null ||
      rates.some((rate) => rate === null)
    ) {
      setValues(null);
      setError("Preencha todos os campos com números válidos.");
      return;
    }
    const products = productStates.map((product, index) => ({
      name: productName(product.taxTreatment),
      taxTreatment: product.taxTreatment,
      rateType: product.rateType,
      ratePercent: rates[index] as number,
    })) as [FixedIncomeProductInput, FixedIncomeProductInput];
    const nextValues = { initialAmount, termDays, cdiAnnualPercent, products };
    const result = calculateFixedIncomeComparison(nextValues);
    if (result.status === "invalid") {
      setValues(null);
      setError(result.message);
      return;
    }
    setError(null);
    setValues(nextValues);
  }

  const result = values ? calculateFixedIncomeComparison(values) : null;

  return (
    <>
      <section className="manual-card" aria-labelledby="comparador-renda-fixa">
        <div className="manual-card-heading">
          <div>
            <span className="manual-eyebrow">Comparação líquida</span>
            <h2 id="comparador-renda-fixa">Configure o cenário e os dois produtos</h2>
          </div>
        </div>
        <p className="manual-intro">
          O CDI do Banco Central vem preenchido como referência, mas pode ser alterado
          para testar outro cenário. A projeção mantém essa taxa constante até o resgate.
        </p>
        <form className="fixed-income-form" onSubmit={handleSubmit}>
          <div className="fixed-income-common-fields">
            <label>
              <span>Valor investido</span>
              <small>Aplicação única, sem aportes</small>
              <div className="manual-input-wrap">
                <span>R$</span>
                <input
                  value={amountInput}
                  onChange={(event) => {
                    setAmountInput(event.target.value);
                    clearResult();
                  }}
                  inputMode="decimal"
                  placeholder="Ex.: 10.000,00"
                  required
                />
              </div>
            </label>
            <label>
              <span>Prazo</span>
              <small>Dias corridos até o resgate</small>
              <div className="manual-input-wrap manual-input-suffix">
                <input
                  value={termInput}
                  onChange={(event) => {
                    setTermInput(event.target.value);
                    clearResult();
                  }}
                  inputMode="numeric"
                  required
                />
                <span>dias</span>
              </div>
            </label>
            <label>
              <span>CDI anual de referência</span>
              <small>
                {cdiReference
                  ? `BCB em ${formatReferenceDate(cdiReference.referenceDate)}`
                  : "Informe uma premissa para a projeção"}
              </small>
              <div className="manual-input-wrap manual-input-suffix">
                <input
                  value={cdiInput}
                  onChange={(event) => {
                    setCdiInput(event.target.value);
                    clearResult();
                  }}
                  inputMode="decimal"
                  placeholder="Ex.: 14,15"
                  required
                />
                <span>% a.a.</span>
              </div>
            </label>
          </div>

          <div className="fixed-income-products-grid">
            <ProductFields
              position="A"
              state={productStates[0]}
              onChange={(value) => updateProduct(0, value)}
            />
            <ProductFields
              position="B"
              state={productStates[1]}
              onChange={(value) => updateProduct(1, value)}
            />
          </div>
          <button className="primary-link fixed-income-submit" type="submit">
            Comparar investimentos
          </button>
        </form>
        <p className="manual-privacy">
          Prazo mínimo de 30 dias. IOF, inflação, taxas da instituição e risco de
          crédito não entram na simulação.
        </p>
        {error ? <p className="manual-error" role="alert">{error}</p> : null}
      </section>

      {values && result?.status === "valid" ? (
        <>
          <section className="comparison-highlight" aria-live="polite">
            <span className="result-label">Melhor resultado líquido no cenário</span>
            <h2>
              {result.winner === null
                ? "Os dois produtos terminam empatados"
                : result.products[result.winner].name}
            </h2>
            <p>
              {result.winner === null
                ? "A diferença final é inferior a um centavo."
                : `${currencyFormatter.format(result.difference)} a mais no resgate.`}
            </p>
          </section>

          <div className="fixed-income-results-grid">
            {result.products.map((product, index) => (
              <section
                className={`content-card fixed-income-result-card ${result.winner === index ? "is-winner" : ""}`}
                key={`${product.name}-${index}`}
              >
                <span className="manual-eyebrow">Produto {index === 0 ? "A" : "B"}</span>
                <h2>{product.name}</h2>
                <strong className="fixed-income-final-value">
                  {currencyFormatter.format(product.netFinalAmount)}
                </strong>
                <span className="result-caption">Valor líquido no resgate</span>
                <dl className="fixed-income-detail-list">
                  <div><dt>Rendimento bruto</dt><dd>{currencyFormatter.format(product.grossEarnings)}</dd></div>
                  <div><dt>Imposto de Renda</dt><dd>{currencyFormatter.format(product.incomeTaxAmount)}</dd></div>
                  <div><dt>Lucro líquido</dt><dd>{currencyFormatter.format(product.netEarnings)}</dd></div>
                  <div><dt>Retorno líquido</dt><dd>{percentFormatter.format(product.netReturnPercent)}%</dd></div>
                  <div><dt>Taxa bruta anual equivalente</dt><dd>{numberFormatter.format(product.annualGrossRatePercent)}%</dd></div>
                </dl>
                <p className="fixed-income-equivalence">
                  Para empatar, um produto {product.taxTreatment === "regressive" ? "isento" : "tributável"}
                  {" "}precisaria render aproximadamente {product.equivalentOppositeTaxCdiPercent === null
                    ? "uma taxa não calculável neste cenário"
                    : `${numberFormatter.format(product.equivalentOppositeTaxCdiPercent)}% do CDI`}.
                </p>
              </section>
            ))}
          </div>

          <div className="manual-content-grid">
            <section className="content-card" aria-labelledby="premissas-renda-fixa">
              <h2 id="premissas-renda-fixa">Premissas utilizadas</h2>
              <dl className="metric-grid">
                <MetricCard label="Aplicação" value={currencyFormatter.format(values.initialAmount)} detail="Sem aportes adicionais" />
                <MetricCard label="Prazo" value={`${values.termDays} dias`} detail="Dias corridos" />
                <MetricCard label="CDI projetado" value={`${numberFormatter.format(values.cdiAnnualPercent)}% a.a.`} detail="Mantido constante" />
              </dl>
            </section>
            <aside className="content-card side-card" aria-labelledby="limites-renda-fixa">
              <h2 id="limites-renda-fixa">Antes de decidir</h2>
              <ul className="limitations-list">
                <li>Compare também liquidez, vencimento, emissor e cobertura aplicável.</li>
                <li>O CDI futuro provavelmente será diferente da premissa.</li>
                <li>LCI/LCA podem ter carência e disponibilidade distintas.</li>
                <li>A simulação não desconta inflação nem custos externos.</li>
                <li>O resultado não é recomendação de investimento.</li>
              </ul>
              <Disclaimer />
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
}
