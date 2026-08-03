type DisclaimerVariant =
  | "graham"
  | "bazin"
  | "compound-interest"
  | "fixed-income"
  | "financial-independence";

const messages: Record<DisclaimerVariant, string> = {
  graham:
    "O Número de Graham é apenas uma métrica isolada e não representa recomendação de compra ou venda.",
  bazin:
    "O preço-teto de Bazin é uma referência baseada em proventos passados e não representa recomendação de compra ou venda.",
  "compound-interest":
    "Esta simulação matemática depende das premissas informadas e não representa garantia de retorno.",
  "fixed-income":
    "Esta comparação depende das premissas informadas e não representa recomendação de investimento.",
  "financial-independence":
    "Esta projeção depende das premissas informadas, não garante renda futura e não representa recomendação de investimento.",
};

export function Disclaimer({ variant }: { variant: DisclaimerVariant }) {
  return <p className="disclaimer">{messages[variant]}</p>;
}
