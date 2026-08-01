export type GrahamInvalidReason =
  | "missing-eps"
  | "missing-book-value"
  | "invalid-number"
  | "non-positive-eps"
  | "non-positive-book-value";

export type GrahamResult =
  | { status: "valid"; value: number; radicand: number }
  | { status: "invalid"; reason: GrahamInvalidReason; message: string };

export interface GrahamInput {
  eps?: number | null;
  bookValuePerShare?: number | null;
}

export function calculateGrahamNumber({
  eps,
  bookValuePerShare,
}: GrahamInput): GrahamResult {
  if (eps === null || eps === undefined) {
    return {
      status: "invalid",
      reason: "missing-eps",
      message: "O LPA não está disponível para este ativo.",
    };
  }

  if (bookValuePerShare === null || bookValuePerShare === undefined) {
    return {
      status: "invalid",
      reason: "missing-book-value",
      message: "O VPA não está disponível para este ativo.",
    };
  }

  if (!Number.isFinite(eps) || !Number.isFinite(bookValuePerShare)) {
    return {
      status: "invalid",
      reason: "invalid-number",
      message: "Os dados recebidos não formam números válidos para o cálculo.",
    };
  }

  if (eps <= 0) {
    return {
      status: "invalid",
      reason: "non-positive-eps",
      message:
        "O método não é aplicável porque o LPA é igual ou menor que zero.",
    };
  }

  if (bookValuePerShare <= 0) {
    return {
      status: "invalid",
      reason: "non-positive-book-value",
      message:
        "O método não é aplicável porque o VPA é igual ou menor que zero.",
    };
  }

  const radicand = 22.5 * eps * bookValuePerShare;

  return {
    status: "valid",
    value: Math.sqrt(radicand),
    radicand,
  };
}

export type PriceComparison =
  | {
      status: "valid";
      percentage: number;
      position: "above" | "below" | "equal";
    }
  | { status: "invalid" };

export function calculatePriceDifference({
  price,
  grahamNumber,
}: {
  price: number;
  grahamNumber: number;
}): PriceComparison {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(grahamNumber) ||
    price < 0 ||
    grahamNumber <= 0
  ) {
    return { status: "invalid" };
  }

  const percentage = ((price - grahamNumber) / grahamNumber) * 100;
  const position =
    Math.abs(percentage) < 0.005
      ? "equal"
      : percentage > 0
        ? "above"
        : "below";

  return { status: "valid", percentage, position };
}
