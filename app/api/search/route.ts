import { searchStocks } from "@/lib/stocks";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  if (query.length > 60) {
    return Response.json(
      { results: [], demo: false, message: "A busca é longa demais." },
      { status: 400 },
    );
  }

  const result = await searchStocks(query);
  return Response.json(result);
}
