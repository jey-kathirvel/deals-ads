export type SupportedPlatform =
  | "Zepto"
  | "Blinkit"
  | "Swiggy Instamart"
  | "BigBasket"
  | "JioMart"
  | "Amazon"
  | "Flipkart"
  | "Myntra"
  | "Ajio"
  | "Croma"
  | "Reliance Digital"
  | "Meesho"
  | "Generic";

export type ImportDecision =
  | "NEW"
  | "UPDATE_PRICE"
  | "REACTIVATE"
  | "DUPLICATE_UNCHANGED"
  | "DUPLICATE_IN_CURRENT_BATCH"
  | "FAILED";

export type ImportFailureCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PLATFORM"
  | "INVALID_PRODUCT_URL"
  | "PAGE_NOT_FOUND"
  | "ACCESS_BLOCKED"
  | "LOGIN_REQUIRED"
  | "LOCATION_REQUIRED"
  | "PINCODE_NOT_SERVICEABLE"
  | "PRODUCT_UNAVAILABLE"
  | "PRICE_NOT_FOUND"
  | "PRODUCT_NAME_NOT_FOUND"
  | "PRODUCT_IMAGE_NOT_FOUND"
  | "PRODUCT_IMAGE_INVALID"
  | "PRODUCT_IMAGE_TOO_SMALL"
  | "PRODUCT_IMAGE_BLOCKED"
  | "INVALID_PRICE"
  | "FETCH_TIMEOUT"
  | "RATE_LIMITED"
  | "PARSER_FAILED"
  | "UNSAFE_URL"
  | "IMPORT_STOPPED"
  | "INTERNAL_ERROR";

import type { ExtractionStage } from "./providers/types";

export interface ExtractedUrlProduct {
  platform: SupportedPlatform;
  sourceUrl: string;
  canonicalUrl: string;
  externalProductId?: string;
  title: string;
  brand?: string;
  category: string;
  packSize?: string;
  description?: string;
  price: number;
  mrp: number;
  discountPercent: number;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
  availability: "available" | "unavailable" | "unknown";
  fingerprint: string;
  score: number;
  extractionStages?: ExtractionStage[];
}

export interface UrlImportPreviewItem {
  id: string;
  inputUrl: string;
  status: "ready" | "failed" | "duplicate" | "update";
  decision: ImportDecision;
  failureCode?: ImportFailureCode;
  failureReason?: string;
  retryable?: boolean;
  product?: ExtractedUrlProduct;
  existingDealId?: number;
  categoryAction?: "existing" | "created" | "fallback";
  extractionStages?: ExtractionStage[];
}

export interface UrlImportBatch {
  id: string;
  createdAt: string;
  status: "preview" | "committed" | "partial" | "failed";
  options: {
    autoPublish: boolean;
    minimumDiscount: number;
    minimumScore: number;
  };
  items: UrlImportPreviewItem[];
  committedAt?: string;
  summary: {
    submitted: number;
    ready: number;
    updates: number;
    duplicates: number;
    failed: number;
    imported: number;
  };
}
