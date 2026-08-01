export const SITE_CONFIG = {
  name: "Ação Clara",
  description:
    "Número de Graham para ações brasileiras, explicado com clareza.",
} as const;

export const CACHE_TIMES = {
  tickerSearch: 60 * 60 * 24,
  quote: 60 * 5,
  fundamentals: 60 * 60 * 4,
} as const;

export const BRAPI_BASE_URL = "https://brapi.dev/api/v2";
