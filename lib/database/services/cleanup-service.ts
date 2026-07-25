import type {
  DealRecord,
} from "../models";

import {
  DealStatus,
} from "../models";

import type {
  DealRepository,
} from "../repositories";

export interface CleanupOptions {
  now?: Date;
  archivePublishedAfterDays?: number;
  deleteArchivedAfterDays?: number;
}

export interface CleanupSummary {
  expired: number;
  archived: number;
  deleted: number;
}

const DAY_MS =
  24 * 60 * 60 * 1000;

export class CleanupService {

  constructor(
    private readonly repository: DealRepository,
  ) {}

  async run(
    options: CleanupOptions = {},
  ): Promise<CleanupSummary> {

    const now =
      options.now ??
      new Date();

    const archiveDays =
      options.archivePublishedAfterDays ??
      30;

    const deleteDays =
      options.deleteArchivedAfterDays ??
      90;

    let expired = 0;
    let archived = 0;
    let deleted = 0;

    const page =
      await this.repository.findMany({
        limit: 100000,
      });

    for (const deal of page.items) {

      if (
        deal.status !== DealStatus.EXPIRED &&
        deal.expiresAt &&
        deal.expiresAt.getTime() <
          now.getTime()
      ) {

        await this.repository.update(
          deal.id,
          {
            status:
              DealStatus.EXPIRED,

            archivedAt:
              deal.archivedAt ??
              now,

            updatedAt:
              now,
          },
        );

        expired++;
        continue;

      }

      if (
        deal.status ===
          DealStatus.PUBLISHED &&
        deal.publishedAt &&
        now.getTime() -
          deal.publishedAt.getTime() >
          archiveDays * DAY_MS
      ) {

        await this.repository.update(
          deal.id,
          {
            status:
              DealStatus.ARCHIVED,

            archivedAt:
              now,

            updatedAt:
              now,
          },
        );

        archived++;
        continue;

      }

      if (
        deal.status ===
          DealStatus.ARCHIVED &&
        deal.archivedAt &&
        now.getTime() -
          deal.archivedAt.getTime() >
          deleteDays * DAY_MS
      ) {

        await this.repository.delete(
          deal.id,
        );

        deleted++;
      }

    }

    return {
      expired,
      archived,
      deleted,
    };

  }

}
