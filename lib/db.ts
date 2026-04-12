import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

export const db = createClient({
  url,
  authToken,
});

export type GameRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover: string;
  tags: string;
  download: string;
  download_label: string;
  views: number;
  source_id: string;
  source_hash: string;
  created_at: string;
  updated_at: string;
  published_at: string;
};

export type GuideRow = {
  slug: string;
  markdown: string;
  provider: string;
  model: string;
  generated_at: string;
};
