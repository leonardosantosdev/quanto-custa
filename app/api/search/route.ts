import { searchStocks } from "@/lib/stocks";
import type { CalculationMethod } from "@/lib/types";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const requestedMethod = new URL(request.url).searchParams.get("method");
  const method: CalculationMethod = requestedMethod === "bazin" ? "bazin" : "graham";

  if (query.length > 60) {
    return Response.json(
      { results: [], demo: false, message: "A busca é longa demais." },
      { status: 400 },
    );
  }

  const result = await searchStocks(query, method);
  return Response.json(result);
}
