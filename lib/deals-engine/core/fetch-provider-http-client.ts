import type {
  ProviderHttpClient,
  ProviderHttpRequest,
  ProviderHttpResponse,
} from "../contracts";

import {
  ProviderHttpError,
} from "../contracts";

export interface FetchProviderHttpClientOptions {
  defaultTimeoutMs?: number;
  defaultRetries?: number;
  retryDelayMs?: number;
  userAgent?: string;
}

export class FetchProviderHttpClient
implements ProviderHttpClient {
  private readonly defaultTimeoutMs: number;
  private readonly defaultRetries: number;
  private readonly retryDelayMs: number;
  private readonly userAgent: string;

  constructor(
    options: FetchProviderHttpClientOptions = {},
  ) {
    this.defaultTimeoutMs =
      options.defaultTimeoutMs ?? 15_000;

    this.defaultRetries =
      options.defaultRetries ?? 2;

    this.retryDelayMs =
      options.retryDelayMs ?? 500;

    this.userAgent =
      options.userAgent ??
      "DealsAdsDiscoveryBot/1.0";
  }

  async request(
    request: ProviderHttpRequest,
  ): Promise<ProviderHttpResponse> {
    const retries =
      request.retries ?? this.defaultRetries;

    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= retries;
      attempt += 1
    ) {
      try {
        return await this.execute(request);
      } catch (error) {
        lastError = error;

        if (
          attempt >= retries ||
          !this.isRetryable(error)
        ) {
          throw error;
        }

        await this.delay(
          this.retryDelayMs * (attempt + 1),
        );
      }
    }

    throw new ProviderHttpError(
      "Provider request failed",
      request.url,
      undefined,
      lastError,
    );
  }

  private async execute(
    request: ProviderHttpRequest,
  ): Promise<ProviderHttpResponse> {
    const startedAt = Date.now();

    const timeoutMs =
      request.timeoutMs ??
      this.defaultTimeoutMs;

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        timeoutMs,
      );

    try {
      const response =
        await fetch(request.url, {
          method: request.method ?? "GET",

          headers: {
            accept:
              "text/html,application/json;q=0.9,*/*;q=0.8",

            "user-agent":
              this.userAgent,

            ...request.headers,
          },

          body:
            request.method === "POST"
              ? request.body
              : undefined,

          signal:
            controller.signal,

          redirect:
            "follow",
        });

      const body =
        await response.text();

      const headers:
        Record<string, string> = {};

      response.headers.forEach(
        (value, key) => {
          headers[key] = value;
        },
      );

      const result: ProviderHttpResponse = {
        url: response.url || request.url,
        status: response.status,
        ok: response.ok,
        headers,
        body,
        durationMs:
          Date.now() - startedAt,
      };

      if (!response.ok) {
        throw new ProviderHttpError(
          `Provider returned HTTP ${response.status}`,
          result.url,
          response.status,
        );
      }

      return result;
    } catch (error) {
      if (
        error instanceof ProviderHttpError
      ) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new ProviderHttpError(
          `Provider request timed out after ${timeoutMs}ms`,
          request.url,
          undefined,
          error,
        );
      }

      throw new ProviderHttpError(
        "Provider network request failed",
        request.url,
        undefined,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private isRetryable(
    error: unknown,
  ): boolean {
    if (
      !(error instanceof ProviderHttpError)
    ) {
      return true;
    }

    if (error.status === undefined) {
      return true;
    }

    return (
      error.status === 408 ||
      error.status === 425 ||
      error.status === 429 ||
      error.status >= 500
    );
  }

  private async delay(
    milliseconds: number,
  ): Promise<void> {
    await new Promise<void>(
      (resolve) => {
        setTimeout(resolve, milliseconds);
      },
    );
  }
}
