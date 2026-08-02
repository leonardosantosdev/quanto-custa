import { calculatePriceDifference, type PriceComparison } from "@/lib/graham";
import { currencyFormatter, percentFormatter } from "@/lib/formatters";
import type { BazinResult } from "@/lib/bazin";

interface BazinResultPanelProps {
  price?: number | null;
  result: BazinResult;
}

export function formatBazinDifference(comparison: PriceComparison): string {
  if (comparison.status === "invalid") return "Não informada";
  if (comparison.position === "equal") return "No mesmo nível";
  return `${percentFormatter.format(Math.abs(comparison.percentage))}% ${
    comparison.position === "below" ? "abaixo" : "acima"
  }`;
}

export function BazinResultPanel({ price, result }: BazinResultPanelProps) {
  if (result.status === "invalid") {
    return (
      <section className="result-panel" aria-labelledby="resultado-bazin">
        <div className="result-invalid">
          <span className="result-label">Resultado do cálculo</span>
          <h2 id="resultado-bazin">Preço-teto indisponível</h2>
          <p>{result.message}</p>
        </div>
      </section>
    );
  }

  const comparison =
    price === null || price === undefined
      ? { status: "invalid" as const }
      : calculatePriceDifference({ price, grahamNumber: result.value });

  return (
    <section className="result-panel" aria-labelledby="resultado-bazin">
      <div className="result-primary">
        <span className="result-label">Preço-teto de Bazin</span>
        <strong className="result-value" id="resultado-bazin">
          {currencyFormatter.format(result.value)}
        </strong>
        <span className="result-caption">
          Retorno mínimo de {percentFormatter.format(result.minimumYieldPercent)}%
        </span>
      </div>
      <div className="result-secondary">
        <span className="result-label">Cotação considerada</span>
        <strong className="result-value">
          {price === null || price === undefined
            ? "Não informada"
            : currencyFormatter.format(price)}
        </strong>
        <span className="result-caption">Preço atual da ação</span>
      </div>
      <div className="result-secondary">
        <span className="result-label">Diferença</span>
        <strong className="result-value">{formatBazinDifference(comparison)}</strong>
        <span className="result-caption">Em relação ao preço-teto</span>
      </div>
    </section>
  );
}
