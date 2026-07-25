export interface ProviderPaginationRequest<
  TCursor = string,
> {
  cursor?: TCursor;
  page?: number;
  pageSize?: number;
}

export interface ProviderPaginationPage<
  TItem,
  TCursor = string,
> {
  items: readonly TItem[];
  nextCursor?: TCursor;
  hasMore: boolean;
  page?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface ProviderPaginationResult<
  TItem,
  TCursor = string,
> {
  items: readonly TItem[];
  pagesFetched: number;
  nextCursor?: TCursor;
  hasMore: boolean;
  totalItems?: number;
}

export interface ProviderPaginationOptions<
  TItem,
  TCursor = string,
> {
  fetchPage(
    request: ProviderPaginationRequest<TCursor>,
  ): Promise<
    ProviderPaginationPage<TItem, TCursor>
  >;

  initialCursor?: TCursor;
  initialPage?: number;
  pageSize?: number;
  maxPages?: number;
  maxItems?: number;

  getItemKey?(
    item: TItem,
  ): string | number;
}

export class ProviderPaginationError
  extends Error
{
  readonly pagesFetched:
    number;

  readonly cause?:
    unknown;

  constructor(
    message: string,
    options: {
      pagesFetched: number;
      cause?: unknown;
    },
  ) {
    super(message);

    this.name =
      "ProviderPaginationError";

    this.pagesFetched =
      options.pagesFetched;

    this.cause =
      options.cause;
  }
}

function validatePositiveInteger(
  name: string,
  value:
    | number
    | undefined,
): number | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ProviderPaginationError(
      `${name} must be a positive integer`,
      {
        pagesFetched:
          0,
      },
    );
  }

  return value;
}

function freezeItems<TItem>(
  items: readonly TItem[],
): readonly TItem[] {
  return Object.freeze([
    ...items,
  ]);
}

export async function paginateProviderResults<
  TItem,
  TCursor = string,
>(
  options:
    ProviderPaginationOptions<
      TItem,
      TCursor
    >,
): Promise<
  ProviderPaginationResult<
    TItem,
    TCursor
  >
> {
  if (
    typeof options.fetchPage !==
    "function"
  ) {
    throw new ProviderPaginationError(
      "Provider pagination fetchPage must be a function",
      {
        pagesFetched:
          0,
      },
    );
  }

  const initialPage =
    validatePositiveInteger(
      "Provider pagination initialPage",
      options.initialPage,
    ) ?? 1;

  const pageSize =
    validatePositiveInteger(
      "Provider pagination pageSize",
      options.pageSize,
    );

  const maxPages =
    validatePositiveInteger(
      "Provider pagination maxPages",
      options.maxPages,
    );

  const maxItems =
    validatePositiveInteger(
      "Provider pagination maxItems",
      options.maxItems,
    );

  const items:
    TItem[] = [];

  const seenKeys =
    options.getItemKey
      ? new Set<
          string | number
        >()
      : undefined;

  let pagesFetched =
    0;

  let currentPage =
    initialPage;

  let currentCursor =
    options.initialCursor;

  let nextCursor:
    TCursor | undefined =
    currentCursor;

  let hasMore =
    true;

  let totalItems:
    number | undefined;

  while (
    hasMore
  ) {
    if (
      maxPages !== undefined &&
      pagesFetched >= maxPages
    ) {
      break;
    }

    let page:
      ProviderPaginationPage<
        TItem,
        TCursor
      >;

    try {
      page =
        await options.fetchPage({
          cursor:
            currentCursor,

          page:
            currentPage,

          pageSize,
        });
    } catch (
      error
    ) {
      throw new ProviderPaginationError(
        `Provider pagination failed while fetching page ${currentPage}`,
        {
          pagesFetched,
          cause:
            error,
        },
      );
    }

    if (
      !Array.isArray(
        page.items,
      )
    ) {
      throw new ProviderPaginationError(
        `Provider pagination page ${currentPage} returned invalid items`,
        {
          pagesFetched,
        },
      );
    }

    pagesFetched +=
      1;

    if (
      page.totalItems !== undefined
    ) {
      if (
        !Number.isInteger(
          page.totalItems,
        ) ||
        page.totalItems < 0
      ) {
        throw new ProviderPaginationError(
          `Provider pagination page ${currentPage} returned invalid totalItems`,
          {
            pagesFetched,
          },
        );
      }

      totalItems =
        page.totalItems;
    }

    for (
      const item of
      page.items
    ) {
      if (
        maxItems !== undefined &&
        items.length >= maxItems
      ) {
        break;
      }

      if (
        seenKeys &&
        options.getItemKey
      ) {
        const key =
          options.getItemKey(
            item,
          );

        if (
          seenKeys.has(
            key,
          )
        ) {
          continue;
        }

        seenKeys.add(
          key,
        );
      }

      items.push(
        item,
      );
    }

    nextCursor =
      page.nextCursor;

    hasMore =
      page.hasMore;

    if (
      maxItems !== undefined &&
      items.length >= maxItems
    ) {
      break;
    }

    if (
      !hasMore
    ) {
      break;
    }

    if (
      page.nextCursor !== undefined
    ) {
      if (
        Object.is(
          page.nextCursor,
          currentCursor,
        )
      ) {
        throw new ProviderPaginationError(
          `Provider pagination cursor did not advance after page ${currentPage}`,
          {
            pagesFetched,
          },
        );
      }

      currentCursor =
        page.nextCursor;
    }

    currentPage =
      page.page !== undefined
        ? page.page + 1
        : currentPage + 1;
  }

  return Object.freeze({
    items:
      freezeItems(
        maxItems === undefined
          ? items
          : items.slice(
              0,
              maxItems,
            ),
      ),

    pagesFetched,

    nextCursor,

    hasMore,

    totalItems,
  });
}

export async function collectProviderPages<
  TItem,
  TCursor = string,
>(
  options:
    ProviderPaginationOptions<
      TItem,
      TCursor
    >,
): Promise<
  readonly TItem[]
> {
  const result =
    await paginateProviderResults(
      options,
    );

  return result.items;
}
