import type {
  DealQualityResult,
} from "../quality";

import {
  PublishQueue,
} from "./publish-queue";

import type {
  PublishCandidate,
} from "./publish-queue";

import {
  DailyRotationEngine,
} from "./daily-rotation-engine";

import {
  DealExpiryManager,
} from "./deal-expiry-manager";

export interface PublishPipelineDeal
  extends PublishCandidate {
  expiresAt?: Date | string | null;
  quality: DealQualityResult;
}

export interface PublishPipelineResult {
  published: PublishPipelineDeal[];
  archived: PublishPipelineDeal[];
  expired: PublishPipelineDeal[];
}

export class PublishPipeline {
  constructor(
    private readonly queue =
      new PublishQueue(),

    private readonly expiry =
      new DealExpiryManager(),

    private readonly rotation =
      new DailyRotationEngine(),
  ) {}

  run(
    deals: readonly PublishPipelineDeal[],
  ): PublishPipelineResult {
    const expiryResult =
      this.expiry.process(deals);

    /*
     * DealExpiryManager currently exposes ExpiringDeal[].
     * The original objects are preserved at runtime, so restore
     * the richer pipeline type at this integration boundary.
     */
    const activeDeals =
      expiryResult.active as PublishPipelineDeal[];

    const expiredDeals =
      expiryResult.expired as PublishPipelineDeal[];

    const qualityRejected =
      activeDeals.filter(
        deal =>
          !deal.quality.publishable,
      );

    const publishableDeals =
      activeDeals.filter(
        deal =>
          deal.quality.publishable,
      );

    const queueResult =
      this.queue.process(
        publishableDeals,
      );

    const acceptedDeals =
      queueResult.accepted as PublishPipelineDeal[];

    const queueRejected =
      queueResult.rejected as PublishPipelineDeal[];

    const rotationResult =
      this.rotation.rotate(
        acceptedDeals,
      );

    const published =
      rotationResult.published as PublishPipelineDeal[];

    const rotationArchived =
      rotationResult.archived as PublishPipelineDeal[];

    return {
      published,

      archived: [
        ...rotationArchived,
        ...queueRejected,
        ...qualityRejected,
      ],

      expired:
        expiredDeals,
    };
  }
}
