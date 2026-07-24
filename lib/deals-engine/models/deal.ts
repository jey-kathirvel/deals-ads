export type DealStatus =
  | "ACTIVE"
  | "EXPIRING"
  | "EXPIRED"
  | "ARCHIVED";

export interface Deal {
  id?: string;

  platform: string;
  category: string;

  title: string;
  description?: string;

  imageUrl: string;

  dealUrl: string;

  currentPrice: number;
  originalPrice?: number;

  discountPercent?: number;

  rating?: number;
  reviewCount?: number;

  currency: "INR";

  expiresAt?: Date;

  status: DealStatus;

  score?: number;

  discoveredAt: Date;
  publishedAt?: Date;

  metadata?: Record<string, unknown>;
}
