export function normalizeTicker(value: string): string | null {
  const ticker = value.trim().toUpperCase();
  return /^[A-Z]{4}[0-9]{1,2}$/.test(ticker) ? ticker : null;
}

export function looksLikeUnsupportedListedAsset(ticker: string): boolean {
  return /(?:11|3[4-9])$/.test(ticker);
}
