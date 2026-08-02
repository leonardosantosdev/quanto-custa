import "./load-env";

import { runCompanyUniverseSync } from "../lib/company-universe/sync";
import { closeDatabase } from "../lib/db/client";

runCompanyUniverseSync()
  .then((summary) => {
    console.log(JSON.stringify({ event: "company_sync.completed", ...summary }));
    if (summary.status === "partial") process.exitCode = 2;
    if (summary.status === "already-running") process.exitCode = 3;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(JSON.stringify({ event: "company_sync.failed", message }));
    process.exitCode = 1;
  })
  .finally(closeDatabase);
