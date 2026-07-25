import type {
  DealRecord,
} from "../models";

import {
  DealStatus,
} from "../models";

import type {
  DealRepository,
} from "../repositories";

export interface PersistenceSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

export class DiscoveryPersistenceService {

  constructor(
    private readonly repository: DealRepository,
  ) {}

  async persist(
    deals: readonly DealRecord[],
  ): Promise<PersistenceSummary> {

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const deal of deals) {

      const existing =
        await this.repository.findByExternalId(
          deal.source,
          deal.externalId,
        );

      if (!existing) {

        await this.repository.create({
          ...deal,
          status:
            DealStatus.DISCOVERED,
        });

        inserted++;
        continue;
      }

      const changed =
        existing.currentPrice !== deal.currentPrice ||
        existing.originalPrice !== deal.originalPrice ||
        existing.discountPercentage !== deal.discountPercentage ||
        existing.score !== deal.score ||
        existing.title !== deal.title ||
        existing.imageUrl !== deal.imageUrl ||
        existing.url !== deal.url ||
        existing.expiresAt?.getTime() !==
          deal.expiresAt?.getTime();

      if (!changed) {
        skipped++;
        continue;
      }

      await this.repository.update(
        existing.id,
        {
          ...deal,
          updatedAt:
            new Date(),
        },
      );

      updated++;

    }

    return {
      inserted,
      updated,
      skipped,
    };

  }

}
