import assert from "node:assert/strict";

import {
  ProviderPaginationError,
  collectProviderPages,
  paginateProviderResults,
} from "../../lib/providers";

interface Deal {
  id: number;
  title: string;
}

const requests:
  Array<{
    cursor?: string;
    page?: number;
    pageSize?: number;
  }> = [];

const result =
  await paginateProviderResults<
    Deal,
    string
  >({
    initialPage:
      1,

    pageSize:
      2,

    maxPages:
      10,

    getItemKey(
      item,
    ) {
      return item.id;
    },

    async fetchPage(
      request,
    ) {
      requests.push({
        ...request,
      });

      if (
        request.page === 1
      ) {
        return {
          items: [
            {
              id:
                1,

              title:
                "Deal One",
            },
            {
              id:
                2,

              title:
                "Deal Two",
            },
          ],

          nextCursor:
            "cursor-2",

          hasMore:
            true,

          page:
            1,

          pageSize:
            2,

          totalItems:
            4,
        };
      }

      return {
        items: [
          {
            id:
              2,

            title:
              "Deal Two Duplicate",
          },
          {
            id:
              3,

            title:
              "Deal Three",
          },
          {
            id:
              4,

            title:
              "Deal Four",
          },
        ],

        hasMore:
          false,

        page:
          2,

        pageSize:
          2,

        totalItems:
          4,
      };
    },
  });

assert.equal(
  result.pagesFetched,
  2,
);

assert.equal(
  result.hasMore,
  false,
);

assert.equal(
  result.totalItems,
  4,
);

assert.deepEqual(
  result.items.map(
    (
      item,
    ) => item.id,
  ),
  [
    1,
    2,
    3,
    4,
  ],
);

assert.deepEqual(
  requests,
  [
    {
      cursor:
        undefined,

      page:
        1,

      pageSize:
        2,
    },
    {
      cursor:
        "cursor-2",

      page:
        2,

      pageSize:
        2,
    },
  ],
);

const limited =
  await paginateProviderResults<
    number
  >({
    maxItems:
      3,

    async fetchPage(
      request,
    ) {
      const page =
        request.page ?? 1;

      return {
        items: [
          page * 10 + 1,
          page * 10 + 2,
        ],

        hasMore:
          true,

        page,
      };
    },
  });

assert.deepEqual(
  limited.items,
  [
    11,
    12,
    21,
  ],
);

assert.equal(
  limited.pagesFetched,
  2,
);

assert.equal(
  limited.hasMore,
  true,
);

const maxPageResult =
  await paginateProviderResults<
    number
  >({
    maxPages:
      2,

    async fetchPage(
      request,
    ) {
      const page =
        request.page ?? 1;

      return {
        items: [
          page,
        ],

        hasMore:
          true,

        page,
      };
    },
  });

assert.deepEqual(
  maxPageResult.items,
  [
    1,
    2,
  ],
);

assert.equal(
  maxPageResult.pagesFetched,
  2,
);

assert.equal(
  maxPageResult.hasMore,
  true,
);

const collected =
  await collectProviderPages<
    string
  >({
    async fetchPage() {
      return {
        items: [
          "one",
          "two",
        ],

        hasMore:
          false,
      };
    },
  });

assert.deepEqual(
  collected,
  [
    "one",
    "two",
  ],
);

await assert.rejects(
  async () =>
    paginateProviderResults({
      pageSize:
        0,

      async fetchPage() {
        return {
          items:
            [],

          hasMore:
            false,
        };
      },
    }),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderPaginationError &&
    error.message.includes(
      "pageSize must be a positive integer",
    ),
);

await assert.rejects(
  async () =>
    paginateProviderResults<
      number,
      string
    >({
      initialCursor:
        "same",

      async fetchPage() {
        return {
          items: [
            1,
          ],

          nextCursor:
            "same",

          hasMore:
            true,
        };
      },
    }),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderPaginationError &&
    error.message.includes(
      "cursor did not advance",
    ),
);

await assert.rejects(
  async () =>
    paginateProviderResults({
      async fetchPage() {
        throw new Error(
          "provider unavailable",
        );
      },
    }),

  (
    error: unknown,
  ) =>
    error instanceof
      ProviderPaginationError &&
    error.pagesFetched ===
      0 &&
    error.cause instanceof
      Error &&
    error.cause.message ===
      "provider unavailable",
);

console.log(
  JSON.stringify(
    {
      status:
        "passed",

      cursorPagination:
        true,

      pagePagination:
        true,

      maxPages:
        true,

      maxItems:
        true,

      deduplication:
        true,

      errorWrapping:
        true,
    },
    null,
    2,
  ),
);
