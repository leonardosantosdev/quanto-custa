import Link from "next/link";

export function ValuationMethodSwitch({ active }: { active: "graham" | "bazin" }) {
  return (
    <nav className="valuation-method-switch" aria-label="Método de cálculo">
      {active === "graham" ? (
        <span aria-current="page">Número de Graham</span>
      ) : (
        <Link href="/">Número de Graham</Link>
      )}
      {active === "bazin" ? (
        <span aria-current="page">Preço-teto de Bazin</span>
      ) : (
        <Link href="/bazin">Preço-teto de Bazin</Link>
      )}
    </nav>
  );
}
