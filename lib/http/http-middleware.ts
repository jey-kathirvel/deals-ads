import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "./http-types";

import {
  cloneRequest,
} from "./http-utils";

export interface HttpMiddleware {
  intercept<TBody = unknown>(
    request: HttpRequest,
    next: HttpClient,
  ): Promise<HttpResponse<TBody>>;
}

export type HttpMiddlewareFunction =
  <TBody = unknown>(
    request: HttpRequest,
    next: HttpClient,
  ) => Promise<HttpResponse<TBody>>;

export class FunctionHttpMiddleware
  implements HttpMiddleware {

  constructor(
    private readonly middleware:
      HttpMiddlewareFunction,
  ) {}

  intercept<TBody = unknown>(
    request: HttpRequest,
    next: HttpClient,
  ): Promise<HttpResponse<TBody>> {
    return this.middleware<TBody>(
      request,
      next,
    );
  }
}

export interface MiddlewareHttpClientOptions {
  client: HttpClient;

  middleware?:
    readonly HttpMiddleware[];
}

export class MiddlewareHttpClient
  implements HttpClient {

  private readonly client:
    HttpClient;

  private readonly middleware:
    readonly HttpMiddleware[];

  constructor(
    options:
      MiddlewareHttpClientOptions,
  ) {
    this.client =
      options.client;

    this.middleware = [
      ...(
        options.middleware ??
        []
      ),
    ];
  }

  request<TBody = unknown>(
    request:
      HttpRequest,
  ): Promise<
    HttpResponse<TBody>
  > {
    return this.dispatch<TBody>(
      0,
      cloneRequest(
        request,
      ),
    );
  }

  private dispatch<TBody>(
    index: number,
    request:
      HttpRequest,
  ): Promise<
    HttpResponse<TBody>
  > {
    const middleware =
      this.middleware[
        index
      ];

    if (
      !middleware
    ) {
      return this.client
        .request<TBody>(
          request,
        );
    }

    const next:
      HttpClient = {

      request:
        <TNextBody = unknown>(
          nextRequest:
            HttpRequest,
        ): Promise<
          HttpResponse<TNextBody>
        > =>
          this.dispatch<TNextBody>(
            index + 1,
            nextRequest,
          ),

    };

    return middleware
      .intercept<TBody>(
        request,
        next,
      );
  }
}
