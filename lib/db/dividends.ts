import "server-only";

import { getDatabase } from "@/lib/db/client";
import type { ShareClass } from "@/lib/cvm/types";

export interface StoredAnnualProceeds {
  ticker: string;
  companyName: string;
  shareClass: ShareClass;
  dividendsPerShare: number;
  jcpGrossPerShare: number;
  jcpNetPerShare: number;
  netProceedsPerShare: number;
  eventCount: number;
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
}

function isoValue(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function getAnnualProceeds(
  ticker: string,
): Promise<StoredAnnualProceeds | null> {
  const sql = getDatabase();
  const [row] = await sql<
    {
      ticker: string;
      company_name: string;
      share_class: ShareClass;
      dividends_per_share: string | number;
      jcp_gross_per_share: string | number;
      jcp_net_per_share: string | number;
      net_proceeds_per_share: string | number;
      event_count: number;
      period_start: string | Date;
      period_end: string | Date;
      updated_at: string | Date;
    }[]
  >`
    SELECT
      c.ticker,
      c.company_name,
      c.share_class,
      COALESCE(SUM(p.gross_value_per_share) FILTER (
        WHERE p.proceeds_type = 'dividend'
      ), 0) AS dividends_per_share,
      COALESCE(SUM(p.gross_value_per_share) FILTER (
        WHERE p.proceeds_type = 'jcp'
      ), 0) AS jcp_gross_per_share,
      COALESCE(SUM(p.net_value_per_share) FILTER (
        WHERE p.proceeds_type = 'jcp'
      ), 0) AS jcp_net_per_share,
      SUM(p.net_value_per_share) AS net_proceeds_per_share,
      COUNT(*)::INTEGER AS event_count,
      MIN(p.ex_date) AS period_start,
      MAX(p.ex_date) AS period_end,
      MAX(p.updated_at) AS updated_at
    FROM companies c
    JOIN cash_proceeds p ON p.ticker = c.ticker
    WHERE c.ticker = ${ticker.toUpperCase()}
      AND c.is_active = TRUE
      AND p.is_active = TRUE
      AND p.ex_date > CURRENT_DATE - INTERVAL '1 year'
      AND p.ex_date <= CURRENT_DATE
    GROUP BY c.ticker, c.company_name, c.share_class
    LIMIT 1
  `;
  if (!row) return null;
  return {
    ticker: row.ticker,
    companyName: row.company_name,
    shareClass: row.share_class,
    dividendsPerShare: Number(row.dividends_per_share),
    jcpGrossPerShare: Number(row.jcp_gross_per_share),
    jcpNetPerShare: Number(row.jcp_net_per_share),
    netProceedsPerShare: Number(row.net_proceeds_per_share),
    eventCount: Number(row.event_count),
    periodStart: isoValue(row.period_start).slice(0, 10),
    periodEnd: isoValue(row.period_end).slice(0, 10),
    updatedAt: isoValue(row.updated_at),
  };
}
