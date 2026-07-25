import type {
  DealValidator,
  DiscoveryContext,
  DiscoveryProvider,
  ProviderRegistry,
  RawDeal,
} from "../contracts";

import {
  CategoryValidator,
  ExpiryValidator,
  ImageValidator,
  PriceValidator,
  RetailerValidator,
  TitleValidator,
  UrlValidator,
} from "../validators";

import {
  AmazonDiscoveryProvider,
} from "../providers/amazon-discovery-provider";

import {
  FlipkartDiscoveryProvider,
} from "../providers/flipkart-discovery-provider";

import {
  DealProcessingPipeline,
} from "./deal-processing-pipeline";

import {
  InMemoryProviderRegistry,
} from "./provider-registry";

export interface DiscoverySchedulerResult {

  providers: number;

  succeeded: number;

  failed: number;

  discovered: number;

  validated: number;

  validationRejected: number;

  duplicates: number;

  qualityRejected: number;

  published: number;

  durationMs: number;

  deals: RawDeal[];

  errors: string[];
}

export class DiscoveryScheduler {

  private readonly registry:
    ProviderRegistry;

  private readonly validators:
    DealValidator[];

  constructor(
    registry?: ProviderRegistry,
    validators?: DealValidator[],
    registerDefaults = true,
  ) {

    this.registry =
      registry ??
      new InMemoryProviderRegistry();

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

    if (registerDefaults) {
      this.registerDefaultProviders();
    }
  }

  async run(
    context: DiscoveryContext,
  ): Promise<DiscoverySchedulerResult> {

    const startedAt =
      Date.now();

    const providers =
      this.registry.getEnabled();

    const executions =
      await Promise.allSettled(
        providers.map(
          (
            provider:
              DiscoveryProvider,
          ) =>
            provider.discover(
              context,
            ),
        ),
      );

    const discoveredDeals:
      RawDeal[] = [];

    const errors:
      string[] = [];

    let succeeded = 0;

    let failed = 0;

    for (
      let index = 0;
      index < executions.length;
      index++
    ) {

      const execution =
        executions[index];

      const provider =
        providers[index];

      if (
        execution.status ===
        "rejected"
      ) {

        failed++;

        errors.push(
          `${provider.info.id}: ${
            execution.reason instanceof Error
              ? execution.reason.message
              : String(execution.reason)
          }`,
        );

        continue;
      }

      const result =
        execution.value;

      const providerFailed =
        result.success === false ||
        result.errors.length > 0;

      if (providerFailed) {

        failed++;

        errors.push(
          ...result.errors.map(
            error =>
              `${result.providerId}: ${error}`,
          ),
        );

      } else {

        succeeded++;

      }

      discoveredDeals.push(
        ...result.deals,
      );
    }

    const processing =
      await new DealProcessingPipeline(
        this.validators,
      ).process(
        discoveredDeals,
      );

    return {

      providers:
        providers.length,

      succeeded,

      failed,

      discovered:
        processing.discoveredDeals,

      validated:
        processing.validatedDeals,

      validationRejected:
        processing.validationRejectedDeals,

      duplicates:
        processing.duplicateDeals,

      qualityRejected:
        processing.qualityRejectedDeals,

      published:
        processing.publishableDeals.length,

      durationMs:
        Date.now() -
        startedAt,

      deals:
        processing.publishableDeals,

      errors,
    };
  }

  register(
    provider: DiscoveryProvider,
  ): void {

    this.registry.register(
      provider,
    );
  }

  unregister(
    providerId: string,
  ): void {

    this.registry.unregister(
      providerId,
    );
  }

  providers(): DiscoveryProvider[] {

    return this.registry.getAll();
  }

  private registerDefaultProviders(): void {

    const providers:
      DiscoveryProvider[] = [
        new AmazonDiscoveryProvider(),
        new FlipkartDiscoveryProvider(),
      ];

    for (
      const provider of providers
    ) {

      if (
        this.registry.get(
          provider.info.id,
        )
      ) {
        continue;
      }

      this.registry.register(
        provider,
      );
    }
  }
}
