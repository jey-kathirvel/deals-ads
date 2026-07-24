import type {
  DiscoveryContext,
  DiscoveryProvider,
  RawDeal,
} from "../contracts";

import {
  DealProcessingPipeline,
  InMemoryProviderRegistry,
} from "../core";

export interface DiscoverySchedulerResult {

  providers: number;

  succeeded: number;

  failed: number;

  discovered: number;

  published: number;

  durationMs: number;

  deals: RawDeal[];
}

export class DiscoveryScheduler {

  constructor(
    private readonly registry =
      new InMemoryProviderRegistry(),

    private readonly pipeline =
      new DealProcessingPipeline(),
  ) {}

  async run(
    context: DiscoveryContext,
  ): Promise<DiscoverySchedulerResult> {

    const startedAt = Date.now();

    const providers =
      this.registry.all();

    const executions =
      await Promise.allSettled(

        providers.map(
          provider =>
            provider.discover(
              context,
            ),
        ),

      );

    const discovered: RawDeal[] = [];

    let succeeded = 0;

    let failed = 0;

    for (const execution of executions) {

      if (
        execution.status ===
        "fulfilled"
      ) {

        succeeded++;

        discovered.push(
          ...execution.value.deals,
        );

      } else {

        failed++;

      }

    }

    const published =
      this.pipeline.process(
        discovered,
      );

    return {

      providers:
        providers.length,

      succeeded,

      failed,

      discovered:
        discovered.length,

      published:
        published.length,

      durationMs:
        Date.now() -
        startedAt,

      deals:
        published,
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
}
