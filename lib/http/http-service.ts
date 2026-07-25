import {
  FetchHttpClient,
} from "./fetch-http-client";

import {
  HttpRequestBuilder,
} from "./http-request-builder";

import type {
  HttpBody,
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "./http-types";

export interface HttpServiceOptions {
  client?: HttpClient;
}

export class HttpService {
  private readonly client:
    HttpClient;

  constructor(
    options:
      HttpServiceOptions = {},
  ) {
    this.client =
      options.client ??
      new FetchHttpClient();
  }

  request<TBody = unknown>(
    request:
      HttpRequest,
  ): Promise<
    HttpResponse<TBody>
  > {
    return this.client.request<TBody>(
      request,
    );
  }

  get<TBody = unknown>(
    url: string,
  ): Promise<
    HttpResponse<TBody>
  > {
    return this.request<TBody>(
      HttpRequestBuilder
        .get(
          url,
        )
        .build(),
    );
  }

  post<TBody = unknown>(
    url: string,
    body: HttpBody,
  ): Promise<
    HttpResponse<TBody>
  > {
    return this.request<TBody>(
      HttpRequestBuilder
        .post(
          url,
        )
        .body(
          body,
        )
        .build(),
    );
  }
}
