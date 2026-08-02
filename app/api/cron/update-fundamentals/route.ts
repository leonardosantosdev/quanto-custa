import { timingSafeEqual } from "node:crypto";

import {
  runFundamentalsIngestion,
  type IngestionSummary,
} from "@/lib/cvm/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export function isAuthorizedCronRequest(
  authorization: string | null,
  secret = process.env.CRON_SECRET,
): boolean {
  if (!authorization || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(authorization, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

type PipelineRunner = () => Promise<IngestionSummary>;

export function createCronHandler(run: PipelineRunner = runFundamentalsIngestion) {
  return async function cronHandler(request: Request): Promise<Response> {
    if (!isAuthorizedCronRequest(request.headers.get("authorization"))) {
      return Response.json({ ok: false, message: "Não autorizado." }, { status: 401 });
    }

    try {
      const summary = await run();
      if (summary.status === "already-running") {
        return Response.json(
          { ok: false, message: "Uma ingestão já está em execução.", summary },
          { status: 409 },
        );
      }
      return Response.json({ ok: true, summary });
    } catch {
      return Response.json(
        { ok: false, message: "A atualização de fundamentos falhou." },
        { status: 503 },
      );
    }
  };
}

export const GET = createCronHandler();
