import "./load-env";

import { runDividendSync } from "../lib/b3-dividends/sync";
import { closeDatabase } from "../lib/db/client";

runDividendSync({ full: process.argv.includes("--full") })
  .then((summary) => {
    console.log(JSON.stringify({ event: "dividend_ingestion.completed", ...summary }));
    if (summary.status === "partial") process.exitCode = 2;
    if (summary.status === "already-running") process.exitCode = 3;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(JSON.stringify({ event: "dividend_ingestion.failed", message }));
    process.exitCode = 1;
  })
  .finally(closeDatabase);
