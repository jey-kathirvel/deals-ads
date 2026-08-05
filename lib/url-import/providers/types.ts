import type { SupportedPlatform } from "../types";

export type ExtractionStageName =
  | "url_validation"
  | "platform_detection"
  | "page_fetch"
  | "product_detection"
  | "product_name"
  | "product_image"
  | "price"
  | "category";

export interface ExtractionStage {
  stage: ExtractionStageName;
  status: "success" | "failed" | "skipped";
  message: string;
  durationMs?: number;
}

export interface ProviderExtraction {
  title?: string;
  imageUrl?: string;
  imageCandidates?: Array<{ url: string; source: string; priority: number }>;
  price?: number;
  mrp?: number;
  brand?: string;
  category?: string;
  description?: string;
  externalProductId?: string;
  availability?: "available" | "unavailable" | "unknown";
  rating?: number;
  reviewCount?: number;
}

export interface ProviderContext {
  requestedUrl: URL;
  finalUrl: URL;
  html: string;
  signal?: AbortSignal;
}

export interface UrlImportProvider {
  platform: SupportedPlatform;
  supports(url: URL): boolean;
  isProductUrl(url: URL): boolean;
  extract(context: ProviderContext): Promise<ProviderExtraction>;
}
