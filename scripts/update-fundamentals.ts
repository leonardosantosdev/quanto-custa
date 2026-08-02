import "./load-env";

import { runFundamentalsIngestion } from "../lib/cvm/pipeline";
import { closeDatabase } from "../lib/db/client";

runFundamentalsIngestion()
  .then((summary) => {
    console.log(JSON.stringify({ event: "manual_ingestion.completed", ...summary }));
    if (summary.status === "partial") process.exitCode = 2;
    if (summary.status === "already-running") process.exitCode = 3;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(JSON.stringify({ event: "manual_ingestion.failed", message }));
    process.exitCode = 1;
  })
  .finally(closeDatabase);
