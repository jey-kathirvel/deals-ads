import type { RawDeal } from "./discovery-provider";

export interface DealProcessingResult {
  discoveredDeals: number;
  validatedDeals: number;
  validationRejectedDeals: number;
  duplicateDeals: number;
  qualityRejectedDeals: number;
  publishableDeals: RawDeal[];
  durationMs: number;
}
