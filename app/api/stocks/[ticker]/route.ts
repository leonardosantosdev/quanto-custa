import { getStock } from "@/lib/brapi";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/stocks/[ticker]">,
) {
  const { ticker } = await params;
  const result = await getStock(ticker);
  const status =
    result.status === "success"
      ? 200
      : result.status === "not-found"
        ? 404
        : result.status === "unsupported"
          ? 422
          : 503;

  return Response.json(result, { status });
}
