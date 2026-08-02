import { getBazinStock } from "@/lib/bazin-stocks";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/bazin/[ticker]">,
) {
  const { ticker } = await params;
  const result = await getBazinStock(ticker);
  const status =
    result.status === "success" || result.status === "manual"
      ? 200
      : result.status === "not-found"
        ? 404
        : result.status === "unsupported"
          ? 422
          : 503;
  return Response.json(result, { status });
}
