import type {
  DiscoveryContext,
  DiscoveryProvider,
  ProviderDiscoveryResult,
} from "../contracts";

import { InMemoryProviderRegistry } from "./provider-registry";

export class DiscoveryManager {
  constructor(
    private readonly registry: InMemoryProviderRegistry,
  ) {}

  async discover(
    context: DiscoveryContext,
  ): Promise<ProviderDiscoveryResult[]> {

    const providers = this.registry.getEnabled();

    const results: ProviderDiscoveryResult[] = [];

    for (const provider of providers) {
      try {
        results.push(
          await provider.discover(context),
        );
      } catch (error) {
        results.push({
          providerId: provider.info.id,
          deals: [],
          discovered: 0,
          durationMs: 0,
          errors: [
            error instanceof Error
              ? error.message
              : "Unknown provider error",
          ],
        });
      }
    }

    return results;
  }
}
