export enum DealStatus {
  DISCOVERED = "DISCOVERED",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
  EXPIRED = "EXPIRED",
}

export enum DealSource {
  AMAZON = "AMAZON",
  FLIPKART = "FLIPKART",
  OTHER = "OTHER",
}

export interface DealRecord {
  id: string;

  externalId: string;

  source: DealSource;

  status: DealStatus;

  title: string;

  url: string;

  imageUrl: string;

  category: string;

  currency: string;

  currentPrice: number;

  originalPrice: number;

  discountPercentage: number;

  score: number;

  discoveredAt: Date;

  expiresAt?: Date | null;

  publishedAt?: Date | null;

  archivedAt?: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
