import type {
  DealRecord,
  DealSource,
  DealStatus,
} from "../models";

export interface DealRepositorySearch {
  status?: DealStatus;
  source?: DealSource;
  category?: string;
  minimumScore?: number;
  minimumDiscountPercentage?: number;
  expiresAfter?: Date;
  expiresBefore?: Date;
  searchText?: string;
}

export interface DealRepositoryPagination {
  limit?: number;
  offset?: number;
}

export type DealRepositorySortField =
  | "score"
  | "discountPercentage"
  | "currentPrice"
  | "discoveredAt"
  | "publishedAt"
  | "createdAt"
  | "updatedAt";

export interface DealRepositorySort {
  field?: DealRepositorySortField;
  direction?: "asc" | "desc";
}

export interface DealRepositoryQuery
  extends DealRepositorySearch,
    DealRepositoryPagination {
  sort?: DealRepositorySort;
}

export interface DealRepositoryPage {
  items: DealRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface DealRepository {
  create(
    deal: DealRecord,
  ): Promise<DealRecord>;

  createMany(
    deals: readonly DealRecord[],
  ): Promise<DealRecord[]>;

  findById(
    id: string,
  ): Promise<DealRecord | null>;

  findByExternalId(
    source: DealSource,
    externalId: string,
  ): Promise<DealRecord | null>;

  findMany(
    query?: DealRepositoryQuery,
  ): Promise<DealRepositoryPage>;

  update(
    id: string,
    changes: Partial<
      Omit<
        DealRecord,
        "id" | "createdAt"
      >
    >,
  ): Promise<DealRecord | null>;

  delete(
    id: string,
  ): Promise<boolean>;

  count(
    search?: DealRepositorySearch,
  ): Promise<number>;

  existsByExternalId(
    source: DealSource,
    externalId: string,
  ): Promise<boolean>;
}
