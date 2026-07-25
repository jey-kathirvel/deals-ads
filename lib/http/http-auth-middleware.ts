import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "./http-types";

import {
  cloneRequest,
} from "./http-utils";

import type {
  HttpMiddleware,
} from "./http-middleware";

import type {
  HttpAuthenticationContext,
  HttpAuthenticationStrategy,
} from "./http-auth-types";

export type HttpAuthenticationContextProvider =
  (
    request: HttpRequest,
  ) =>
    | HttpAuthenticationContext
    | Promise<HttpAuthenticationContext>;

export interface HttpAuthenticationMiddlewareOptions {
  strategies:
    readonly HttpAuthenticationStrategy[];

  context?:
    HttpAuthenticationContext;

  contextProvider?:
    HttpAuthenticationContextProvider;
}

export class HttpAuthenticationMiddleware
  implements HttpMiddleware
{
  private readonly strategies:
    readonly HttpAuthenticationStrategy[];

  private readonly context?:
    HttpAuthenticationContext;

  private readonly contextProvider?:
    HttpAuthenticationContextProvider;

  constructor(
    options:
      HttpAuthenticationMiddlewareOptions,
  ) {
    if (
      options.strategies.length ===
      0
    ) {
      throw new Error(
        "HTTP authentication middleware requires at least one strategy",
      );
    }

    if (
      options.context &&
      options.contextProvider
    ) {
      throw new Error(
        "HTTP authentication middleware cannot use both context and contextProvider",
      );
    }

    this.strategies = [
      ...options.strategies,
    ];

    this.context =
      options.context
        ? {
            ...options.context,
          }
        : undefined;

    this.contextProvider =
      options.contextProvider;
  }

  async intercept<TBody = unknown>(
    request:
      HttpRequest,

    next:
      HttpClient,
  ): Promise<
    HttpResponse<TBody>
  > {
    const authenticatedRequest =
      cloneRequest(
        request,
      );

    const context =
      await this.resolveContext(
        authenticatedRequest,
      );

    let headers = {
      ...authenticatedRequest.headers,
    };

    let query = {
      ...authenticatedRequest.query,
    };

    for (
      const strategy of
      this.strategies
    ) {
      const result =
        await strategy.authenticate(
          context,
        );

      if (
        result.headers
      ) {
        headers = {
          ...headers,
          ...result.headers,
        };
      }

      if (
        result.query
      ) {
        query = {
          ...query,
          ...result.query,
        };
      }
    }

    return next.request<TBody>({
      ...authenticatedRequest,

      headers:
        Object.keys(
          headers,
        ).length > 0
          ? headers
          : undefined,

      query:
        Object.keys(
          query,
        ).length > 0
          ? query
          : undefined,
    });
  }

  private async resolveContext(
    request:
      HttpRequest,
  ): Promise<
    HttpAuthenticationContext | undefined
  > {
    if (
      this.contextProvider
    ) {
      const context =
        await this.contextProvider(
          cloneRequest(
            request,
          ),
        );

      return {
        ...context,
      };
    }

    if (
      this.context
    ) {
      return {
        ...this.context,
      };
    }

    return undefined;
  }
}
