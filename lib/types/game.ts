export interface SourcePostTag {
  _id: string;
  name: string;
  heat?: number;
}

export interface SourcePostResource {
  url: string;
  platform?: string;
  extract_code?: string;
  unzip_psw?: string;
}

export interface SourcePost {
  _id: string;
  title: string;
  views: number;
  tags: SourcePostTag[];
  content: string;
  cover: string;
  created_at: string;
  updated_at: string;
  resources?: SourcePostResource[];
  download_platforms?: string[];
}

export interface GameRecord {
  sourceId: string;
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  cover: string;
  download: string;
  downloadLabel: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  sourceHash: string;
}

export interface GuideDocument {
  slug: string;
  title: string;
  markdown: string;
  generatedAt: string;
  sourceHash: string;
  provider: string;
  model: string;
}

export interface GuideSection {
  title: string;
  lines: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}
