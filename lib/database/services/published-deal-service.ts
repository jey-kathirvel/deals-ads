import type {
  DealRecord,
} from "../models";

import {
  DealStatus,
} from "../models";

import type {
  DealRepository,
} from "../repositories";

export interface PublishedDealTransitionSummary {
  published: number;
  archived: number;
  expired: number;
  unchanged: number;
  missing: number;
}

export interface PublishedDealTransitionInput {
  published: readonly Pick<
    DealRecord,
    "id"
  >[];

  archived: readonly Pick<
    DealRecord,
    "id"
  >[];

  expired: readonly Pick<
    DealRecord,
    "id"
  >[];
}

export interface PublishedDealServiceOptions {
  now?: () => Date;
}

export class PublishedDealService {
  private readonly now: () => Date;

  constructor(
    private readonly repository: DealRepository,
    options: PublishedDealServiceOptions = {},
  ) {
    this.now =
      options.now ??
      (() => new Date());
  }

  async applyTransitions(
    input: PublishedDealTransitionInput,
  ): Promise<PublishedDealTransitionSummary> {
    const summary: PublishedDealTransitionSummary = {
      published: 0,
      archived: 0,
      expired: 0,
      unchanged: 0,
      missing: 0,
    };

    const transitionIds =
      this.validateTransitionSets(
        input,
      );

    for (
      const id of transitionIds.published
    ) {
      await this.transitionToPublished(
        id,
        summary,
      );
    }

    for (
      const id of transitionIds.archived
    ) {
      await this.transitionToArchived(
        id,
        summary,
      );
    }

    for (
      const id of transitionIds.expired
    ) {
      await this.transitionToExpired(
        id,
        summary,
      );
    }

    return summary;
  }

  async publish(
    ids: readonly string[],
  ): Promise<PublishedDealTransitionSummary> {
    return this.applyTransitions({
      published:
        ids.map(
          id => ({
            id,
          }),
        ),

      archived:
        [],

      expired:
        [],
    });
  }

  async archive(
    ids: readonly string[],
  ): Promise<PublishedDealTransitionSummary> {
    return this.applyTransitions({
      published:
        [],

      archived:
        ids.map(
          id => ({
            id,
          }),
        ),

      expired:
        [],
    });
  }

  async expire(
    ids: readonly string[],
  ): Promise<PublishedDealTransitionSummary> {
    return this.applyTransitions({
      published:
        [],

      archived:
        [],

      expired:
        ids.map(
          id => ({
            id,
          }),
        ),
    });
  }

  private async transitionToPublished(
    id: string,
    summary: PublishedDealTransitionSummary,
  ): Promise<void> {
    const existing =
      await this.repository.findById(
        id,
      );

    if (!existing) {
      summary.missing += 1;
      return;
    }

    if (
      existing.status ===
        DealStatus.PUBLISHED &&
      existing.publishedAt !== null &&
      existing.publishedAt !== undefined &&
      (
        existing.archivedAt === null ||
        existing.archivedAt === undefined
      )
    ) {
      summary.unchanged += 1;
      return;
    }

    const transitionTime =
      this.now();

    await this.repository.update(
      id,
      {
        status:
          DealStatus.PUBLISHED,

        publishedAt:
          existing.publishedAt ??
          transitionTime,

        archivedAt:
          null,

        updatedAt:
          transitionTime,
      },
    );

    summary.published += 1;
  }

  private async transitionToArchived(
    id: string,
    summary: PublishedDealTransitionSummary,
  ): Promise<void> {
    const existing =
      await this.repository.findById(
        id,
      );

    if (!existing) {
      summary.missing += 1;
      return;
    }

    if (
      existing.status ===
        DealStatus.ARCHIVED &&
      existing.archivedAt !== null &&
      existing.archivedAt !== undefined
    ) {
      summary.unchanged += 1;
      return;
    }

    const transitionTime =
      this.now();

    await this.repository.update(
      id,
      {
        status:
          DealStatus.ARCHIVED,

        archivedAt:
          existing.archivedAt ??
          transitionTime,

        updatedAt:
          transitionTime,
      },
    );

    summary.archived += 1;
  }

  private async transitionToExpired(
    id: string,
    summary: PublishedDealTransitionSummary,
  ): Promise<void> {
    const existing =
      await this.repository.findById(
        id,
      );

    if (!existing) {
      summary.missing += 1;
      return;
    }

    if (
      existing.status ===
      DealStatus.EXPIRED
    ) {
      summary.unchanged += 1;
      return;
    }

    const transitionTime =
      this.now();

    await this.repository.update(
      id,
      {
        status:
          DealStatus.EXPIRED,

        archivedAt:
          existing.archivedAt ??
          transitionTime,

        updatedAt:
          transitionTime,
      },
    );

    summary.expired += 1;
  }

  private validateTransitionSets(
    input: PublishedDealTransitionInput,
  ): {
    published: string[];
    archived: string[];
    expired: string[];
  } {
    const published =
      this.uniqueIds(
        input.published,
      );

    const archived =
      this.uniqueIds(
        input.archived,
      );

    const expired =
      this.uniqueIds(
        input.expired,
      );

    const ownership =
      new Map<string, string>();

    for (
      const [
        transition,
        ids,
      ] of [
        [
          "published",
          published,
        ],

        [
          "archived",
          archived,
        ],

        [
          "expired",
          expired,
        ],
      ] as const
    ) {
      for (
        const id of ids
      ) {
        const previous =
          ownership.get(
            id,
          );

        if (previous) {
          throw new Error(
            [
              `Deal "${id}"`,
              "cannot be included in both",
              `"${previous}"`,
              "and",
              `"${transition}"`,
              "transition sets",
            ].join(" "),
          );
        }

        ownership.set(
          id,
          transition,
        );
      }
    }

    return {
      published,
      archived,
      expired,
    };
  }

  private uniqueIds(
    deals: readonly Pick<
      DealRecord,
      "id"
    >[],
  ): string[] {
    const ids =
      new Set<string>();

    for (
      const deal of deals
    ) {
      const id =
        deal.id.trim();

      if (!id) {
        throw new Error(
          "Deal transition id cannot be empty",
        );
      }

      ids.add(
        id,
      );
    }

    return [
      ...ids,
    ];
  }
}
