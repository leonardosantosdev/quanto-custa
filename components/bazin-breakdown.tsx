import { currencyFormatter, numberFormatter } from "@/lib/formatters";
import type { BazinResult } from "@/lib/bazin";

export function BazinBreakdown({ result }: { result: BazinResult }) {
  if (result.status === "invalid") {
    return <p className="formula-unavailable">{result.message}</p>;
  }
  return (
    <div className="formula-breakdown">
      <div>
        <span>Proventos líquidos em 12 meses</span> ={" "}
        {currencyFormatter.format(result.annualProceedsPerShare)}
      </div>
      <div>
        <span>Retorno mínimo</span> = {numberFormatter.format(result.minimumYieldPercent)}%
      </div>
      <div>
        <span>Preço-teto</span> = {currencyFormatter.format(result.annualProceedsPerShare)} ÷{" "}
        {numberFormatter.format(result.minimumYieldPercent / 100)} ={" "}
        {currencyFormatter.format(result.value)}
      </div>
    </div>
  );
}
