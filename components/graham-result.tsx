import { calculatePriceDifference, type GrahamResult } from "@/lib/graham";
import { currencyFormatter, percentFormatter } from "@/lib/formatters";

interface GrahamResultPanelProps {
  price: number;
  result: GrahamResult;
}

export function GrahamResultPanel({ price, result }: GrahamResultPanelProps) {
  if (result.status === "invalid") {
    return (
      <section className="result-panel" aria-labelledby="resultado">
        <div className="result-invalid">
          <span className="result-label">Resultado do cálculo</span>
          <h2 id="resultado">Número de Graham indisponível</h2>
          <p>{result.message}</p>
        </div>
      </section>
    );
  }

  const comparison = calculatePriceDifference({
    price,
    grahamNumber: result.value,
  });
  const difference =
    comparison.status === "valid"
      ? `${percentFormatter.format(Math.abs(comparison.percentage))}% ${
          comparison.position === "below"
            ? "abaixo"
            : comparison.position === "above"
              ? "acima"
              : "no mesmo nível"
        }`
      : "Indisponível";

  return (
    <section className="result-panel" aria-labelledby="resultado">
      <div className="result-primary">
        <span className="result-label">Número de Graham</span>
        <strong className="result-value" id="resultado">
          {currencyFormatter.format(result.value)}
        </strong>
        <span className="result-caption">Resultado da fórmula</span>
      </div>
      <div className="result-secondary">
        <span className="result-label">Cotação considerada</span>
        <strong className="result-value">{currencyFormatter.format(price)}</strong>
        <span className="result-caption">Preço informado pela fonte</span>
      </div>
      <div className="result-secondary">
        <span className="result-label">Diferença</span>
        <strong className="result-value">{difference}</strong>
        <span className="result-caption">Em relação à fórmula</span>
      </div>
    </section>
  );
}
