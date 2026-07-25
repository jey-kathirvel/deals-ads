import type {
  HttpBody,
  HttpHeaders,
  HttpMethod,
  HttpQuery,
  HttpRequest,
} from "./http-types";

import {
  cloneRequest,
} from "./http-utils";

export class HttpRequestBuilder {

  private readonly request:
    HttpRequest;

  constructor(
    method: HttpMethod,
    url: string,
  ) {
    this.request = {
      method,
      url,
    };
  }

  static get(
    url: string,
  ): HttpRequestBuilder {
    return new HttpRequestBuilder(
      "GET",
      url,
    );
  }

  static post(
    url: string,
  ): HttpRequestBuilder {
    return new HttpRequestBuilder(
      "POST",
      url,
    );
  }

  method(
    value: HttpMethod,
  ): this {
    this.request.method =
      value;
    return this;
  }

  url(
    value: string,
  ): this {
    this.request.url =
      value;
    return this;
  }

  timeout(
    value: number,
  ): this {
    this.request.timeoutMs =
      value;
    return this;
  }

  userAgent(
    value: string,
  ): this {
    this.request.userAgent =
      value;
    return this;
  }

  header(
    name: string,
    value:
      string |
      number |
      boolean,
  ): this {

    this.request.headers ??=
      {};

    this.request.headers[
      name
    ] = value;

    return this;
  }

  headers(
    values:
      HttpHeaders,
  ): this {

    this.request.headers = {
      ...this.request.headers,
      ...values,
    };

    return this;
  }

  query(
    values:
      HttpQuery,
  ): this {

    this.request.query = {
      ...this.request.query,
      ...values,
    };

    return this;
  }

  body(
    value:
      HttpBody,
  ): this {

    this.request.body =
      value;

    return this;
  }

  signal(
    signal:
      AbortSignal,
  ): this {

    this.request.signal =
      signal;

    return this;
  }

  build():
    HttpRequest {

    return cloneRequest(
      this.request,
    );

  }

}
