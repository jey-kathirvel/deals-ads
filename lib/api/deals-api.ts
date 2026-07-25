import {
  DealSource,
  DealStatus,
} from "../database/models";

import type {
  DealRecord,
} from "../database/models";

import type {
  DealRepository,
  DealRepositoryQuery,
  DealRepositorySortField,
} from "../database/repositories";

export type DealsApiSortDirection =
  | "asc"
  | "desc";

export interface DealsApiRequest {
  status?: DealStatus;
  category?: string;
  source?: DealSource;
  minimumScore?: number;
  minimumDiscountPercentage?: number;
  expiresAfter?: Date | string;
  expiresBefore?: Date | string;
  searchText?: string;
  sortBy?: DealRepositorySortField;
  sortDirection?: DealsApiSortDirection;
  limit?: number;
  offset?: number;
}

export interface DealsApiResponse {
  total: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: DealRecord[];
}

export interface DealsApiMetadata {
  statuses: DealStatus[];
  sources: DealSource[];
  sortFields: DealRepositorySortField[];
  sortDirections: DealsApiSortDirection[];
  defaultLimit: number;
  maximumLimit: number;
}

export interface DealsApiOptions {
  defaultLimit?: number;
  maximumLimit?: number;
  defaultStatus?: DealStatus | null;
}

const DEFAULT_LIMIT = 25;
const MAXIMUM_LIMIT = 100;

const SORT_FIELDS: DealRepositorySortField[] = [
  "score",
  "discountPercentage",
  "currentPrice",
  "discoveredAt",
  "publishedAt",
  "createdAt",
  "updatedAt",
];

function normalizeInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (
    value === undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return fallback;
  }

  return Math.min(
    Math.max(
      Math.trunc(
        value,
      ),
      minimum,
    ),
    maximum,
  );
}

function normalizeOptionalNumber(
  value: number | undefined,
  minimum: number,
  maximum: number,
): number | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      "Numeric filter must be a finite number",
    );
  }

  if (
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `Numeric filter must be between ${minimum} and ${maximum}`,
    );
  }

  return value;
}

function normalizeOptionalText(
  value: string | undefined,
): string | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized === ""
    ? undefined
    : normalized;
}

function normalizeOptionalDate(
  value: Date | string | undefined,
  field: string,
): Date | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  const date =
    value instanceof Date
      ? new Date(
          value.getTime(),
        )
      : new Date(
          value,
        );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `${field} must be a valid date`,
    );
  }

  return date;
}

export class DealsApi {
  private readonly defaultLimit: number;
  private readonly maximumLimit: number;
  private readonly defaultStatus:
    DealStatus | null;

  constructor(
    private readonly repository:
      DealRepository,

    options:
      DealsApiOptions = {},
  ) {
    this.maximumLimit =
      normalizeInteger(
        options.maximumLimit,
        MAXIMUM_LIMIT,
        1,
        500,
      );

    this.defaultLimit =
      normalizeInteger(
        options.defaultLimit,
        DEFAULT_LIMIT,
        1,
        this.maximumLimit,
      );

    this.defaultStatus =
      options.defaultStatus ===
      undefined
        ? null
        : options.defaultStatus;
  }

  async listDeals(
    request:
      DealsApiRequest = {},
  ): Promise<DealsApiResponse> {
    const limit =
      normalizeInteger(
        request.limit,
        this.defaultLimit,
        1,
        this.maximumLimit,
      );

    const offset =
      normalizeInteger(
        request.offset,
        0,
        0,
        Number.MAX_SAFE_INTEGER,
      );

    const minimumScore =
      normalizeOptionalNumber(
        request.minimumScore,
        0,
        100,
      );

    const minimumDiscountPercentage =
      normalizeOptionalNumber(
        request.minimumDiscountPercentage,
        0,
        100,
      );

    const expiresAfter =
      normalizeOptionalDate(
        request.expiresAfter,
        "expiresAfter",
      );

    const expiresBefore =
      normalizeOptionalDate(
        request.expiresBefore,
        "expiresBefore",
      );

    if (
      expiresAfter &&
      expiresBefore &&
      expiresAfter.getTime() >=
        expiresBefore.getTime()
    ) {
      throw new Error(
        "expiresAfter must be earlier than expiresBefore",
      );
    }

    const sortBy =
      request.sortBy ??
      "score";

    if (
      !SORT_FIELDS.includes(
        sortBy,
      )
    ) {
      throw new Error(
        `Unsupported sort field "${sortBy}"`,
      );
    }

    const sortDirection =
      request.sortDirection ??
      "desc";

    const status =
      request.status ??
      this.defaultStatus ??
      undefined;

    const query:
      DealRepositoryQuery = {
        status,

        source:
          request.source,

        category:
          normalizeOptionalText(
            request.category,
          ),

        minimumScore,

        minimumDiscountPercentage,

        expiresAfter,

        expiresBefore,

        searchText:
          normalizeOptionalText(
            request.searchText,
          ),

        limit,

        offset,

        sort: {
          field:
            sortBy,

          direction:
            sortDirection,
        },
      };

    const page =
      await this.repository.findMany(
        query,
      );

    return {
      total:
        page.total,

      limit:
        page.limit,

      offset:
        page.offset,

      hasNextPage:
        page.offset +
          page.items.length <
        page.total,

      hasPreviousPage:
        page.offset > 0,

      items:
        page.items,
    };
  }

  async getDeal(
    id: string,
  ): Promise<DealRecord | null> {
    const normalizedId =
      id.trim();

    if (
      normalizedId === ""
    ) {
      throw new Error(
        "Deal id cannot be empty",
      );
    }

    return this.repository.findById(
      normalizedId,
    );
  }

  metadata():
    DealsApiMetadata {
    return {
      statuses:
        Object.values(
          DealStatus,
        ),

      sources:
        Object.values(
          DealSource,
        ),

      sortFields:
        [
          ...SORT_FIELDS,
        ],

      sortDirections: [
        "asc",
        "desc",
      ],

      defaultLimit:
        this.defaultLimit,

      maximumLimit:
        this.maximumLimit,
    };
  }
}
