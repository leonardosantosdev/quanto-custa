import type { GrahamResult } from "@/lib/graham";
import { currencyFormatter, numberFormatter } from "@/lib/formatters";

interface FormulaBreakdownProps {
  eps: number | null;
  bookValuePerShare: number | null;
  result: GrahamResult;
}

export function FormulaBreakdown({
  eps,
  bookValuePerShare,
  result,
}: FormulaBreakdownProps) {
  if (result.status === "invalid") {
    return (
      <div className="formula-breakdown">
        <div>√(22,5 × LPA × VPA)</div>
        <div className="formula-unavailable">{result.message}</div>
      </div>
    );
  }

  return (
    <div className="formula-breakdown" aria-label="Memória do cálculo">
      √(22,5 × <span>{numberFormatter.format(eps ?? 0)}</span> ×{" "}
      <span>{numberFormatter.format(bookValuePerShare ?? 0)}</span>) ={" "}
      <strong>{currencyFormatter.format(result.value)}</strong>
    </div>
  );
}
