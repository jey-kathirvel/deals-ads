import type { DealRecord } from "../database/models";

export interface ProviderMetadata {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
}

export interface DiscoveryContext {
  runId: string;
  startedAt: Date;
}

export interface DiscoveryResult {
  providerId: string;
  discovered: DealRecord[];
  durationMs: number;
}

export interface DealProvider {
  metadata(): ProviderMetadata;

  discover(
    context: DiscoveryContext,
  ): Promise<DiscoveryResult>;
}
