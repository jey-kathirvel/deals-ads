import type {
  DiscoveryAggregate,
  ProviderDiscoveryResult,
  RawDeal,
} from "../contracts";

export class DiscoveryAggregator {
  aggregate(
    providerResults: ProviderDiscoveryResult[],
    startedAt: number,
  ): DiscoveryAggregate {
    const deals: RawDeal[] = [];
    const errors: string[] = [];

    let providersSucceeded = 0;
    let providersFailed = 0;

    for (const result of providerResults) {
      deals.push(...result.deals);

      if (result.errors.length > 0) {
        providersFailed += 1;

        errors.push(
          ...result.errors.map(
            (error) => `[${result.providerId}] ${error}`,
          ),
        );
      } else {
        providersSucceeded += 1;
      }
    }

    return {
      deals,
      providerResults,
      providersAttempted: providerResults.length,
      providersSucceeded,
      providersFailed,
      discovered: deals.length,
      durationMs: Math.max(0, Date.now() - startedAt),
      errors,
    };
  }
}
