import type { Client } from "@libsql/client";

export type SyncStats = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  pages: number;
  stoppedEarly: boolean;
  dryRun: boolean;
};

export type RunCatalogSyncOptions = {
  db: Client;
  sourceApiUrl: string;
  pageSize?: number;
  maxPages?: number;
  categorySlugs?: string | string[];
  excludeKeywords?: string | string[];
  imageCdnBase?: string;
  stopThreshold?: number;
  dryRun?: boolean;
  log?: (...args: unknown[]) => void;
};

export function runCatalogSync(options: RunCatalogSyncOptions): Promise<SyncStats>;
