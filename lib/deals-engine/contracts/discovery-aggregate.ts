import type {
  ProviderDiscoveryResult,
  RawDeal,
} from "./discovery-provider";

export interface DiscoveryAggregate {
  deals: RawDeal[];

  providerResults: ProviderDiscoveryResult[];

  providersAttempted: number;

  providersSucceeded: number;

  providersFailed: number;

  discovered: number;

  durationMs: number;

  errors: string[];
}
