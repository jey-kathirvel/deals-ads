import type { Category } from "./category";
import type { Price } from "./price";
import type { Retailer } from "./retailer";

/**
 * Canonical Deals Engine domain model.
 *
 * Transitional flattened properties are retained until the existing
 * discovery pipeline is migrated to the nested price/retailer model.
 */
export interface Deal {
  id: string;

  /** Canonical retailer identifier. */
  retailer?: Retailer;

  /**
   * Transitional compatibility property used by the current engine.
   * Future providers will migrate to `retailer`.
   */
  platform: string;

  category: Category | string;

  title: string;

  description?: string;

  imageUrl: string;

  dealUrl: string;

  /** Canonical nested price model. */
  price?: Price;

  /**
   * Transitional flattened price properties used by the current engine.
   */
  currentPrice: number;

  currency: "INR";

  status?: "ACTIVE" | "EXPIRING" | "EXPIRED" | "ARCHIVED";



  originalPrice?: number;

  discountPercent?: number;

  rating?: number;

  reviewCount?: number;

  /**
   * Expiry is mandatory for final publication.
   * It remains optional during raw discovery and validation.
   */
  expiresAt?: Date;

  score?: number;

  discoveredAt: Date;

  publishedAt?: Date;

  source?: string;

  metadata?: Record<string, unknown>;
}
