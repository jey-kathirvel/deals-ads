import {
  HttpNetworkError,
} from "./http-errors";

import type {
  HttpClient,
  HttpMethod,
  HttpRequest,
  HttpResponse,
} from "./http-types";

import {
  cloneRequest,
} from "./http-utils";

import type {
  HttpMiddleware,
} from "./http-middleware";

const DEFAULT_RETRYABLE_STATUS_CODES =
  new Set([
    408,
    425,
    429,
    500,
    502,
    503,
    504,
  ]);

const DEFAULT_RETRYABLE_METHODS =
  new Set<HttpMethod>([
    "GET",
    "HEAD",
    "OPTIONS",
    "PUT",
    "DELETE",
  ]);

export interface HttpRetryContext<
  TBody = unknown,
> {
  request: HttpRequest;

  retryNumber: number;
  maxRetries: number;
  delayMs: number;

  response?:
    HttpResponse<TBody>;

  error?:
    unknown;
}

export type HttpRetryHook =
  (
    context:
      HttpRetryContext,
  ) =>
    void |
    Promise<void>;

export type HttpRetryPredicate =
  (
    context:
      HttpRetryContext,
  ) =>
    boolean |
    Promise<boolean>;

export type HttpRetrySleep =
  (
    delayMs: number,
    signal?: AbortSignal,
  ) => Promise<void>;

export interface HttpRetryMiddlewareOptions {
  maxRetries?: number;

  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;

  jitterRatio?: number;

  retryableStatusCodes?:
    readonly number[];

  retryableMethods?:
    readonly HttpMethod[];

  retryNetworkErrors?: boolean;

  shouldRetry?:
    HttpRetryPredicate;

  onRetry?:
    HttpRetryHook;

  sleep?:
    HttpRetrySleep;

  random?:
    () => number;
}

function validateNonNegativeInteger(
  name: string,
  value: number,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `${name} must be a non-negative integer`,
    );
  }
}

function validateNonNegativeNumber(
  name: string,
  value: number,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `${name} must be a non-negative number`,
    );
  }
}

function validatePositiveNumber(
  name: string,
  value: number,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be greater than 0`,
    );
  }
}

function createAbortError(
  signal:
    AbortSignal,
): unknown {
  if (
    signal.reason !==
    undefined
  ) {
    return signal.reason;
  }

  return new DOMException(
    "The HTTP retry operation was aborted",
    "AbortError",
  );
}

function throwIfAborted(
  signal:
    AbortSignal | undefined,
): void {
  if (
    signal?.aborted
  ) {
    throw createAbortError(
      signal,
    );
  }
}

async function defaultSleep(
  delayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(
    signal,
  );

  if (
    delayMs === 0
  ) {
    return;
  }

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      let timeout:
        ReturnType<typeof setTimeout>;

      const cleanup =
        (): void => {
          signal?.removeEventListener(
            "abort",
            onAbort,
          );

          clearTimeout(
            timeout,
          );
        };

      const onAbort =
        (): void => {
          cleanup();

          reject(
            signal
              ? createAbortError(
                  signal,
                )
              : new DOMException(
                  "The HTTP retry operation was aborted",
                  "AbortError",
                ),
          );
        };

      timeout =
        setTimeout(
          () => {
            cleanup();
            resolve();
          },
          delayMs,
        );

      signal?.addEventListener(
        "abort",
        onAbort,
        {
          once:
            true,
        },
      );
    },
  );
}

export class HttpRetryMiddleware
  implements HttpMiddleware {

  private readonly maxRetries:
    number;

  private readonly baseDelayMs:
    number;

  private readonly maxDelayMs:
    number;

  private readonly backoffMultiplier:
    number;

  private readonly jitterRatio:
    number;

  private readonly retryableStatusCodes:
    ReadonlySet<number>;

  private readonly retryableMethods:
    ReadonlySet<HttpMethod>;

  private readonly retryNetworkErrors:
    boolean;

  private readonly shouldRetry?:
    HttpRetryPredicate;

  private readonly onRetry?:
    HttpRetryHook;

  private readonly sleep:
    HttpRetrySleep;

  private readonly random:
    () => number;

  constructor(
    options:
      HttpRetryMiddlewareOptions = {},
  ) {
    this.maxRetries =
      options.maxRetries ??
      3;

    this.baseDelayMs =
      options.baseDelayMs ??
      250;

    this.maxDelayMs =
      options.maxDelayMs ??
      5_000;

    this.backoffMultiplier =
      options.backoffMultiplier ??
      2;

    this.jitterRatio =
      options.jitterRatio ??
      0;

    validateNonNegativeInteger(
      "HTTP retry maxRetries",
      this.maxRetries,
    );

    validateNonNegativeNumber(
      "HTTP retry baseDelayMs",
      this.baseDelayMs,
    );

    validateNonNegativeNumber(
      "HTTP retry maxDelayMs",
      this.maxDelayMs,
    );

    validatePositiveNumber(
      "HTTP retry backoffMultiplier",
      this.backoffMultiplier,
    );

    validateNonNegativeNumber(
      "HTTP retry jitterRatio",
      this.jitterRatio,
    );

    if (
      this.jitterRatio > 1
    ) {
      throw new Error(
        "HTTP retry jitterRatio must be between 0 and 1",
      );
    }

    if (
      this.maxDelayMs <
      this.baseDelayMs
    ) {
      throw new Error(
        "HTTP retry maxDelayMs must be greater than or equal to baseDelayMs",
      );
    }

    this.retryableStatusCodes =
      new Set(
        options.retryableStatusCodes ??
        DEFAULT_RETRYABLE_STATUS_CODES,
      );

    this.retryableMethods =
      new Set(
        options.retryableMethods ??
        DEFAULT_RETRYABLE_METHODS,
      );

    this.retryNetworkErrors =
      options.retryNetworkErrors ??
      true;

    this.shouldRetry =
      options.shouldRetry;

    this.onRetry =
      options.onRetry;

    this.sleep =
      options.sleep ??
      defaultSleep;

    this.random =
      options.random ??
      Math.random;
  }

  async intercept<TBody = unknown>(
    request:
      HttpRequest,

    next:
      HttpClient,
  ): Promise<
    HttpResponse<TBody>
  > {
    throwIfAborted(
      request.signal,
    );

    let retriesCompleted =
      0;

    while (
      true
    ) {
      throwIfAborted(
        request.signal,
      );

      let response:
        HttpResponse<TBody>;

      try {
        response =
          await next.request<TBody>(
            cloneRequest(
              request,
            ),
          );
      } catch (
        error
      ) {
        throwIfAborted(
          request.signal,
        );

        if (
          retriesCompleted >=
          this.maxRetries
        ) {
          throw error;
        }

        const retryNumber =
          retriesCompleted +
          1;

        const context =
          this.createContext<TBody>({
            request,
            retryNumber,
            error,
          });

        if (
          !await this.canRetry(
            context,
          )
        ) {
          throw error;
        }

        await this.prepareRetry(
          context,
        );

        retriesCompleted =
          retryNumber;

        continue;
      }

      if (
        retriesCompleted >=
        this.maxRetries
      ) {
        return response;
      }

      const retryNumber =
        retriesCompleted +
        1;

      const context =
        this.createContext({
          request,
          retryNumber,
          response,
        });

      if (
        !await this.canRetry(
          context,
        )
      ) {
        return response;
      }

      await this.prepareRetry(
        context,
      );

      retriesCompleted =
        retryNumber;
    }
  }

  private createContext<TBody>(
    input: {
      request:
        HttpRequest;

      retryNumber:
        number;

      response?:
        HttpResponse<TBody>;

      error?:
        unknown;
    },
  ): HttpRetryContext<TBody> {
    return {
      request:
        cloneRequest(
          input.request,
        ),

      retryNumber:
        input.retryNumber,

      maxRetries:
        this.maxRetries,

      delayMs:
        this.calculateDelay(
          input.retryNumber,
        ),

      response:
        input.response,

      error:
        input.error,
    };
  }

  private async canRetry<TBody>(
    context:
      HttpRetryContext<TBody>,
  ): Promise<boolean> {
    if (
      !this.retryableMethods.has(
        context.request.method,
      )
    ) {
      return false;
    }

    const defaultDecision =
      context.response
        ? this.retryableStatusCodes.has(
            context.response.status,
          )
        : (
            this.retryNetworkErrors &&
            context.error instanceof
              HttpNetworkError
          );

    if (
      !this.shouldRetry
    ) {
      return defaultDecision;
    }

    return this.shouldRetry(
      context,
    );
  }

  private async prepareRetry<TBody>(
    context:
      HttpRetryContext<TBody>,
  ): Promise<void> {
    throwIfAborted(
      context.request.signal,
    );

    await this.onRetry?.(
      context,
    );

    throwIfAborted(
      context.request.signal,
    );

    await this.sleep(
      context.delayMs,
      context.request.signal,
    );

    throwIfAborted(
      context.request.signal,
    );
  }

  private calculateDelay(
    retryNumber:
      number,
  ): number {
    const exponentialDelay =
      this.baseDelayMs *
      (
        this.backoffMultiplier **
        (
          retryNumber -
          1
        )
      );

    const cappedDelay =
      Math.min(
        exponentialDelay,
        this.maxDelayMs,
      );

    if (
      this.jitterRatio ===
      0
    ) {
      return Math.round(
        cappedDelay,
      );
    }

    const randomValue =
      Math.min(
        1,
        Math.max(
          0,
          this.random(),
        ),
      );

    const jitterMultiplier =
      1 -
      this.jitterRatio +
      (
        randomValue *
        this.jitterRatio *
        2
      );

    return Math.round(
      Math.min(
        cappedDelay *
        jitterMultiplier,
        this.maxDelayMs,
      ),
    );
  }
}
