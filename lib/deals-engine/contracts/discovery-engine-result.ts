import type { RawDeal } from "./discovery-provider";
import type { Deal } from "../models";

export interface DiscoveryEngineSummary {
  providersAttempted: number;
  providersSucceeded: number;
  providersFailed: number;

  discoveredDeals: number;
  validatedDeals: number;
  validationRejectedDeals: number;
  duplicateDeals: number;
  qualityRejectedDeals: number;
  publishedDeals: number;

  durationMs: number;
}

export interface DiscoveryEngineResult {
  providersAttempted: number;
  providersSucceeded: number;
  providersFailed: number;

  discoveredDeals: number;
  validatedDeals: number;
  publishedDeals: number;

  publishableDeals: RawDeal[];

  /*
   * Legacy service compatibility.
   */
  deals: Deal[];
  summary: DiscoveryEngineSummary;

  durationMs: number;
}
