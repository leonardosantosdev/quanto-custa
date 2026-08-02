import "./load-env";

import { closeDatabase } from "../lib/db/client";
import { runMarketDataUpdate } from "../lib/market-data";

runMarketDataUpdate()
  .then((summary) => {
    console.log(JSON.stringify({ event: "market_data_update.completed", ...summary }));
    if (summary.status === "partial") process.exitCode = 2;
    if (summary.status === "already-running") process.exitCode = 3;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(JSON.stringify({ event: "market_data_update.failed", message }));
    process.exitCode = 1;
  })
  .finally(closeDatabase);
