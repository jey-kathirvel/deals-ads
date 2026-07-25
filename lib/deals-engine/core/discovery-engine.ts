import type {
  DealValidator,
  DiscoveryContext,
  DiscoveryEngineResult,
  DiscoveryProvider,
  RawDeal,
} from "../contracts";

import type { Deal } from "../models";

import {
  CategoryValidator,
  ExpiryValidator,
  ImageValidator,
  PriceValidator,
  RetailerValidator,
  TitleValidator,
  UrlValidator,
} from "../validators";

import { DealProcessingPipeline } from "./deal-processing-pipeline";
import { DiscoveryAggregator } from "./discovery-aggregator";
import { DiscoveryManager } from "./discovery-manager";
import { InMemoryProviderRegistry } from "./provider-registry";

import { AmazonDiscoveryProvider } from "../providers/amazon-discovery-provider";
import { FlipkartDiscoveryProvider } from "../providers/flipkart-discovery-provider";


export class DiscoveryEngine {
  private readonly registry: InMemoryProviderRegistry;
  private readonly discoveryManager: DiscoveryManager;
  private readonly validators: DealValidator[];

  constructor(
    discoveryManager?: DiscoveryManager,
    validators?: DealValidator[],
  ) {
    this.registry = new InMemoryProviderRegistry();

    this.discoveryManager =
      discoveryManager ??
      new DiscoveryManager(this.registry);

    this.validators =
      validators ??
      [
        new TitleValidator(),
        new RetailerValidator(),
        new CategoryValidator(),
        new ImageValidator(),
        new UrlValidator(),
        new PriceValidator(),
        new ExpiryValidator(),
      ];
  
    this.registerDefaultProviders();
}

  register(
    provider: DiscoveryProvider | object,
  ): void {
    const candidate =
      provider as DiscoveryProvider & {
        id?: string;
        name?: string;
        enabled?: boolean;
      };

    if (!candidate.info) {
      const providerId =
        candidate.id ??
        candidate.name ??
        candidate.constructor?.name ??
        "legacy-provider";

      Object.defineProperty(candidate, "info", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: {
          id: providerId,
          name:
            candidate.name ??
            candidate.constructor?.name ??
            providerId,
          enabled:
            candidate.enabled !== false,
        },
      });
    }

    this.registry.register(
      candidate as DiscoveryProvider,
    );
  }

  unregister(
    providerId: string,
  ): void {
    this.registry.unregister(providerId);
  }

  private toLegacyDeal(
    rawDeal: RawDeal,
    index: number,
  ): Deal {
    const partial =
      rawDeal as RawDeal & Partial<Deal>;

    const platform =
      partial.platform ??
      rawDeal.retailer ??
      "Unknown";

    return {
      ...rawDeal,

      id:
        partial.id ??
        `${platform}-${Date.now()}-${index}`,

      platform,

      currency:
        partial.currency ??
        "INR",

      status:
        partial.status ??
        "active",

      score:
        partial.score ??
        0,

      metadata:
        partial.metadata ??
        {},
    } as Deal;
  }

  async run(
    context: DiscoveryContext = {} as DiscoveryContext,
  ): Promise<DiscoveryEngineResult> {
    const startedAt = Date.now();

    const providerResults =
      await this.discoveryManager.discover(context);

    const aggregate =
      new DiscoveryAggregator().aggregate(
        providerResults,
        startedAt,
      );

    const processing =
      await new DealProcessingPipeline(
        this.validators,
      ).process(aggregate.deals);

    const durationMs =
      Date.now() - startedAt;

    const publishableDeals =
      processing.publishableDeals;

    const deals: Deal[] =
      publishableDeals.map(
        (deal, index) =>
          this.toLegacyDeal(deal, index),
      );

    const summary = {
      providersAttempted:
        aggregate.providersAttempted,

      providersSucceeded:
        aggregate.providersSucceeded,

      providersFailed:
        aggregate.providersFailed,

      discoveredDeals:
        processing.discoveredDeals,

      validatedDeals:
        processing.validatedDeals,

      validationRejectedDeals:
        processing.validationRejectedDeals,

      duplicateDeals:
        processing.duplicateDeals,

      qualityRejectedDeals:
        processing.qualityRejectedDeals,

      publishedDeals:
        publishableDeals.length,

      durationMs,
    };

    return {
      providersAttempted:
        summary.providersAttempted,

      providersSucceeded:
        summary.providersSucceeded,

      providersFailed:
        summary.providersFailed,

      discoveredDeals:
        summary.discoveredDeals,

      validatedDeals:
        summary.validatedDeals,

      publishedDeals:
        summary.publishedDeals,

      publishableDeals,

      deals,

      summary,

      durationMs,
    };
  }


  private registerDefaultProviders(): void {

    const providers = [
      new AmazonDiscoveryProvider(),
      new FlipkartDiscoveryProvider(),
    ];

    for (const provider of providers) {

      try {

        this.register(provider);

      } catch {

        // Ignore duplicate registration

      }

    }

  }

}