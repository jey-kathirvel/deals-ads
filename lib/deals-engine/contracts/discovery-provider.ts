import type {
  Category,
  ProviderInfo,
  Retailer,
} from "../models";

export interface RawDeal {
  externalId?: string;

  retailer: Retailer;

  category: Category;

  title: string;

  imageUrl: string;

  dealUrl: string;

  currentPrice: number;

  originalPrice: number;

  discountPercent: number;

  expiresAt: Date;

  source: string;

  discoveredAt: Date;

  metadata?: Record<string, unknown>;
}

export interface DiscoveryContext {
  runId: string;

  targetCount: number;

  startedAt: Date;

  signal?: AbortSignal;
}

export interface ProviderDiscoveryResult {
  providerId: string;

  deals: RawDeal[];

  discovered: number;

  durationMs: number;

  errors: string[];

  /**
   * Human-readable provider name.
   * Optional for legacy provider compatibility.
   */
  providerName?: string;

  /**
   * Explicit provider execution status.
   * Optional because legacy results infer failure from error.
   */
  success?: boolean;
}

export interface DiscoveryProvider {
  readonly info: ProviderInfo;

  discover(
    context: DiscoveryContext,
  ): Promise<ProviderDiscoveryResult>;
}
