import "./load-env";

import { SEED_COMPANIES } from "../data/companies";
import { closeDatabase, getDatabase } from "../lib/db/client";

async function seed() {
  const sql = getDatabase();

  await sql.begin(async (transaction) => {
    for (const company of SEED_COMPANIES) {
      await transaction`
        INSERT INTO companies (
          ticker,
          cvm_code,
          cnpj,
          company_name,
          share_class,
          share_class_detail,
          discovery_source,
          fundamentals_enabled,
          is_active,
          last_seen_at,
          updated_at
        ) VALUES (
          ${company.ticker.toUpperCase()},
          ${company.cvmCode},
          ${company.cnpj},
          ${company.companyName},
          ${company.shareClass},
          ${company.shareClassDetail ?? company.shareClass},
          'manual',
          ${company.fundamentalsEnabled ?? true},
          ${company.isActive},
          NOW(),
          NOW()
        )
        ON CONFLICT (ticker) DO UPDATE SET
          cvm_code = EXCLUDED.cvm_code,
          cnpj = EXCLUDED.cnpj,
          company_name = EXCLUDED.company_name,
          share_class = EXCLUDED.share_class,
          share_class_detail = EXCLUDED.share_class_detail,
          discovery_source = 'manual',
          fundamentals_enabled = EXCLUDED.fundamentals_enabled,
          is_active = EXCLUDED.is_active,
          last_seen_at = NOW(),
          updated_at = NOW()
      `;
    }
  });

  console.log(
    JSON.stringify({ event: "companies.seeded", count: SEED_COMPANIES.length }),
  );
}

seed()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(JSON.stringify({ event: "companies.seed_failed", message }));
    process.exitCode = 1;
  })
  .finally(closeDatabase);
