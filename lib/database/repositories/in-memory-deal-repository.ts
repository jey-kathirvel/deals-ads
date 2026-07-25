import type {
  DealRecord,
  DealSource,
} from "../models";

import type {
  DealRepository,
  DealRepositoryPage,
  DealRepositoryQuery,
  DealRepositorySearch,
} from "./deal-repository";

const DEFAULT_LIMIT = 50;
const MAXIMUM_LIMIT = 500;

function cloneDate(
  value: Date | null | undefined,
): Date | null | undefined {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  return new Date(
    value.getTime(),
  );
}

function cloneDeal(
  deal: DealRecord,
): DealRecord {
  return {
    ...deal,

    discoveredAt:
      cloneDate(
        deal.discoveredAt,
      ) as Date,

    expiresAt:
      cloneDate(
        deal.expiresAt,
      ),

    publishedAt:
      cloneDate(
        deal.publishedAt,
      ),

    archivedAt:
      cloneDate(
        deal.archivedAt,
      ),

    createdAt:
      cloneDate(
        deal.createdAt,
      ) as Date,

    updatedAt:
      cloneDate(
        deal.updatedAt,
      ) as Date,
  };
}

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function matchesSearch(
  deal: DealRecord,
  search: DealRepositorySearch,
): boolean {
  if (
    search.status !== undefined &&
    deal.status !== search.status
  ) {
    return false;
  }

  if (
    search.source !== undefined &&
    deal.source !== search.source
  ) {
    return false;
  }

  if (
    search.category !== undefined &&
    normalizeText(
      deal.category,
    ) !==
      normalizeText(
        search.category,
      )
  ) {
    return false;
  }

  if (
    search.minimumScore !== undefined &&
    deal.score <
      search.minimumScore
  ) {
    return false;
  }

  if (
    search.minimumDiscountPercentage !==
      undefined &&
    deal.discountPercentage <
      search.minimumDiscountPercentage
  ) {
    return false;
  }

  if (
    search.expiresAfter !== undefined
  ) {
    if (
      !deal.expiresAt ||
      deal.expiresAt.getTime() <=
        search.expiresAfter.getTime()
    ) {
      return false;
    }
  }

  if (
    search.expiresBefore !== undefined
  ) {
    if (
      !deal.expiresAt ||
      deal.expiresAt.getTime() >=
        search.expiresBefore.getTime()
    ) {
      return false;
    }
  }

  if (
    search.searchText !== undefined &&
    search.searchText.trim() !== ""
  ) {
    const query =
      normalizeText(
        search.searchText,
      );

    const searchableText =
      normalizeText(
        [
          deal.title,
          deal.category,
          deal.externalId,
          deal.url,
        ].join(" "),
      );

    if (
      !searchableText.includes(
        query,
      )
    ) {
      return false;
    }
  }

  return true;
}

function getSortableValue(
  deal: DealRecord,
  field:
    NonNullable<
      NonNullable<
        DealRepositoryQuery["sort"]
      >["field"]
    >,
): number {
  switch (field) {
    case "score":
      return deal.score;

    case "discountPercentage":
      return deal.discountPercentage;

    case "currentPrice":
      return deal.currentPrice;

    case "discoveredAt":
      return deal.discoveredAt.getTime();

    case "publishedAt":
      return deal.publishedAt?.getTime() ?? 0;

    case "createdAt":
      return deal.createdAt.getTime();

    case "updatedAt":
      return deal.updatedAt.getTime();
  }
}

export class InMemoryDealRepository
  implements DealRepository {
  private readonly records =
    new Map<string, DealRecord>();

  async create(
    deal: DealRecord,
  ): Promise<DealRecord> {
    if (
      this.records.has(
        deal.id,
      )
    ) {
      throw new Error(
        `Deal with id "${deal.id}" already exists`,
      );
    }

    const duplicate =
      await this.findByExternalId(
        deal.source,
        deal.externalId,
      );

    if (duplicate) {
      throw new Error(
        [
          "Deal with source",
          `"${deal.source}"`,
          "and externalId",
          `"${deal.externalId}"`,
          "already exists",
        ].join(" "),
      );
    }

    const stored =
      cloneDeal(
        deal,
      );

    this.records.set(
      stored.id,
      stored,
    );

    return cloneDeal(
      stored,
    );
  }

  async createMany(
    deals: readonly DealRecord[],
  ): Promise<DealRecord[]> {
    const ids =
      new Set<string>();

    const externalKeys =
      new Set<string>();

    for (
      const deal of deals
    ) {
      if (
        ids.has(
          deal.id,
        ) ||
        this.records.has(
          deal.id,
        )
      ) {
        throw new Error(
          `Duplicate deal id "${deal.id}"`,
        );
      }

      ids.add(
        deal.id,
      );

      const externalKey =
        this.externalKey(
          deal.source,
          deal.externalId,
        );

      if (
        externalKeys.has(
          externalKey,
        ) ||
        await this.existsByExternalId(
          deal.source,
          deal.externalId,
        )
      ) {
        throw new Error(
          [
            "Duplicate external deal",
            `"${externalKey}"`,
          ].join(" "),
        );
      }

      externalKeys.add(
        externalKey,
      );
    }

    const created: DealRecord[] = [];

    for (
      const deal of deals
    ) {
      const stored =
        cloneDeal(
          deal,
        );

      this.records.set(
        stored.id,
        stored,
      );

      created.push(
        cloneDeal(
          stored,
        ),
      );
    }

    return created;
  }

  async findById(
    id: string,
  ): Promise<DealRecord | null> {
    const deal =
      this.records.get(
        id,
      );

    return deal
      ? cloneDeal(
          deal,
        )
      : null;
  }

  async findByExternalId(
    source: DealSource,
    externalId: string,
  ): Promise<DealRecord | null> {
    for (
      const deal of this.records.values()
    ) {
      if (
        deal.source === source &&
        deal.externalId === externalId
      ) {
        return cloneDeal(
          deal,
        );
      }
    }

    return null;
  }

  async findMany(
    query: DealRepositoryQuery = {},
  ): Promise<DealRepositoryPage> {
    const limit =
      Math.min(
        Math.max(
          query.limit ??
            DEFAULT_LIMIT,
          0,
        ),
        MAXIMUM_LIMIT,
      );

    const offset =
      Math.max(
        query.offset ?? 0,
        0,
      );

    const matching =
      [...this.records.values()]
        .filter(
          deal =>
            matchesSearch(
              deal,
              query,
            ),
        );

    const sortField =
      query.sort?.field ??
      "score";

    const sortDirection =
      query.sort?.direction ??
      "desc";

    matching.sort(
      (
        first,
        second,
      ) => {
        const firstValue =
          getSortableValue(
            first,
            sortField,
          );

        const secondValue =
          getSortableValue(
            second,
            sortField,
          );

        const comparison =
          firstValue === secondValue
            ? first.id.localeCompare(
                second.id,
              )
            : firstValue -
              secondValue;

        return sortDirection ===
          "asc"
          ? comparison
          : -comparison;
      },
    );

    return {
      items:
        matching
          .slice(
            offset,
            offset + limit,
          )
          .map(
            cloneDeal,
          ),

      total:
        matching.length,

      limit,

      offset,
    };
  }

  async update(
    id: string,
    changes: Partial<
      Omit<
        DealRecord,
        "id" | "createdAt"
      >
    >,
  ): Promise<DealRecord | null> {
    const existing =
      this.records.get(
        id,
      );

    if (!existing) {
      return null;
    }

    const nextSource =
      changes.source ??
      existing.source;

    const nextExternalId =
      changes.externalId ??
      existing.externalId;

    for (
      const deal of this.records.values()
    ) {
      if (
        deal.id !== id &&
        deal.source ===
          nextSource &&
        deal.externalId ===
          nextExternalId
      ) {
        throw new Error(
          [
            "Deal with source",
            `"${nextSource}"`,
            "and externalId",
            `"${nextExternalId}"`,
            "already exists",
          ].join(" "),
        );
      }
    }

    const updated: DealRecord = {
      ...existing,
      ...changes,

      id:
        existing.id,

      createdAt:
        existing.createdAt,

      updatedAt:
        changes.updatedAt ??
        new Date(),
    };

    const stored =
      cloneDeal(
        updated,
      );

    this.records.set(
      id,
      stored,
    );

    return cloneDeal(
      stored,
    );
  }

  async delete(
    id: string,
  ): Promise<boolean> {
    return this.records.delete(
      id,
    );
  }

  async count(
    search: DealRepositorySearch = {},
  ): Promise<number> {
    let count = 0;

    for (
      const deal of this.records.values()
    ) {
      if (
        matchesSearch(
          deal,
          search,
        )
      ) {
        count += 1;
      }
    }

    return count;
  }

  async existsByExternalId(
    source: DealSource,
    externalId: string,
  ): Promise<boolean> {
    return (
      await this.findByExternalId(
        source,
        externalId,
      )
    ) !== null;
  }

  private externalKey(
    source: DealSource,
    externalId: string,
  ): string {
    return [
      source,
      externalId,
    ].join(":");
  }
}
