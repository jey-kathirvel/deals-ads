import {
  HttpNetworkError,
  HttpTimeoutError,
} from "./http-errors";

import type {
  HttpClient,
  HttpClientOptions,
  HttpRequest,
  HttpResponse,
} from "./http-types";

import {
  appendQuery,
  applyRequestDefaults,
} from "./http-utils";

export class FetchHttpClient
  implements HttpClient {

  constructor(
    private readonly options:
      HttpClientOptions = {},
  ) {}

  async request<TBody = unknown>(
    request: HttpRequest,
  ): Promise<HttpResponse<TBody>> {

    const resolved =
      applyRequestDefaults(
        request,
        this.options.defaults,
      );

    const controller =
      new AbortController();

    const signal =
      resolved.signal ??
      controller.signal;

    let timeout:
      NodeJS.Timeout | undefined;

    if (resolved.timeoutMs) {
      timeout =
        setTimeout(
          () => controller.abort(),
          resolved.timeoutMs,
        );
    }

    const started =
      Date.now();

    try {

      const response =
        await fetch(
          appendQuery(
            resolved.url,
            resolved.query,
          ),
          {
            method:
              resolved.method,

            headers:
              resolved.headers as Record<string, string>,

            body:
              typeof resolved.body === "string"
                ? resolved.body
                : resolved.body instanceof Uint8Array
                  ? resolved.body.buffer.slice(
                      resolved.body.byteOffset,
                      resolved.body.byteOffset +
                        resolved.body.byteLength,
                    ) as ArrayBuffer
                  : resolved.body == null
                    ? undefined
                    : JSON.stringify(
                        resolved.body,
                      ),

            signal,
          },
        );

      const durationMs =
        Date.now() -
        started;

      const headers:
        Record<string, string> = {};

      response.headers.forEach(
        (
          value,
          key,
        ) => {
          headers[key] =
            value;
        },
      );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      let body:
        unknown;

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        body =
          await response.json();
      } else {
        body =
          await response.text();
      }

      return {
        status:
          response.status,

        statusText:
          response.statusText,

        url:
          response.url,

        headers,

        body:
          body as TBody,

        durationMs,
      };

    } catch (error) {

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new HttpTimeoutError(
          resolved,
          resolved.timeoutMs ??
            0,
          error,
        );
      }

      throw new HttpNetworkError(
        resolved,
        error,
      );

    } finally {

      if (timeout) {
        clearTimeout(
          timeout,
        );
      }

    }

  }

}
