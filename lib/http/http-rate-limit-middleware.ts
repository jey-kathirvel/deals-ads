import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "./http-types";

import type {
  HttpMiddleware,
} from "./http-middleware";

import {
  cloneRequest,
} from "./http-utils";

export type HttpRateLimitKeyProvider =
  (
    request: HttpRequest,
  ) => string | Promise<string>;

export interface HttpRateLimitContext {
  key: string;
  request: HttpRequest;
  queuedAt: number;
  acquiredAt: number;
  waitMs: number;
}

export type HttpRateLimitAcquireHook =
  (
    context: HttpRateLimitContext,
  ) => void | Promise<void>;

export interface HttpRateLimitMiddlewareOptions {
  requestsPerSecond: number;
  burstCapacity?: number;
  key?: string;
  keyProvider?: HttpRateLimitKeyProvider;
  onAcquire?: HttpRateLimitAcquireHook;
}

interface QueueEntry {
  request: HttpRequest;
  queuedAt: number;
  resolve: (
    context: HttpRateLimitContext,
  ) => void;
  reject: (
    error: unknown,
  ) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
  settled: boolean;
}

interface RateLimitBucket {
  tokens: number;
  lastRefillAt: number;
  queue: QueueEntry[];
  timer?: ReturnType<typeof setTimeout>;
}

function validatePositiveNumber(
  name: string,
  value: number,
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be greater than 0`,
    );
  }
}

function validatePositiveInteger(
  name: string,
  value: number,
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer`,
    );
  }
}

function createAbortError(
  signal: AbortSignal,
): unknown {
  if (
    signal.reason !== undefined
  ) {
    return signal.reason;
  }

  return new DOMException(
    "The HTTP rate limit operation was aborted",
    "AbortError",
  );
}

function throwIfAborted(
  signal?: AbortSignal,
): void {
  if (
    signal?.aborted
  ) {
    throw createAbortError(signal);
  }
}

export class HttpRateLimitMiddleware
  implements HttpMiddleware
{
  private readonly requestsPerSecond:
    number;

  private readonly burstCapacity:
    number;

  private readonly key:
    string;

  private readonly keyProvider?:
    HttpRateLimitKeyProvider;

  private readonly onAcquire?:
    HttpRateLimitAcquireHook;

  private readonly buckets =
    new Map<string, RateLimitBucket>();

  constructor(
    options: HttpRateLimitMiddlewareOptions,
  ) {
    validatePositiveNumber(
      "HTTP rate limit requestsPerSecond",
      options.requestsPerSecond,
    );

    const burstCapacity =
      options.burstCapacity ?? 1;

    validatePositiveInteger(
      "HTTP rate limit burstCapacity",
      burstCapacity,
    );

    if (
      options.key &&
      options.keyProvider
    ) {
      throw new Error(
        "HTTP rate limit middleware cannot use both key and keyProvider",
      );
    }

    this.requestsPerSecond =
      options.requestsPerSecond;

    this.burstCapacity =
      burstCapacity;

    this.key =
      options.key ?? "default";

    this.keyProvider =
      options.keyProvider;

    this.onAcquire =
      options.onAcquire;
  }

  async intercept<TBody = unknown>(
    request: HttpRequest,
    next: HttpClient,
  ): Promise<HttpResponse<TBody>> {
    const clonedRequest =
      cloneRequest(request);

    throwIfAborted(
      clonedRequest.signal,
    );

    const key =
      await this.resolveKey(
        clonedRequest,
      );

    const context =
      await this.acquire(
        key,
        clonedRequest,
      );

    await this.onAcquire?.(
      context,
    );

    throwIfAborted(
      clonedRequest.signal,
    );

    return next.request<TBody>(
      clonedRequest,
    );
  }

  private async resolveKey(
    request: HttpRequest,
  ): Promise<string> {
    const resolved =
      this.keyProvider
        ? await this.keyProvider(
            cloneRequest(request),
          )
        : this.key;

    const normalized =
      resolved.trim();

    if (
      normalized.length === 0
    ) {
      throw new Error(
        "HTTP rate limit key cannot be empty",
      );
    }

    return normalized;
  }

  private acquire(
    key: string,
    request: HttpRequest,
  ): Promise<HttpRateLimitContext> {
    throwIfAborted(
      request.signal,
    );

    const queuedAt =
      Date.now();

    const bucket =
      this.getBucket(
        key,
        queuedAt,
      );

    this.refill(
      bucket,
      queuedAt,
    );

    if (
      bucket.queue.length === 0 &&
      bucket.tokens >= 1
    ) {
      bucket.tokens -= 1;

      return Promise.resolve({
        key,
        request:
          cloneRequest(request),
        queuedAt,
        acquiredAt:
          queuedAt,
        waitMs:
          0,
      });
    }

    return new Promise<HttpRateLimitContext>(
      (
        resolve,
        reject,
      ) => {
        const entry:
          QueueEntry = {
            request:
              cloneRequest(request),
            queuedAt,
            resolve,
            reject,
            signal:
              request.signal,
            settled:
              false,
          };

        if (
          entry.signal
        ) {
          entry.abortListener =
            () => {
              if (
                entry.settled
              ) {
                return;
              }

              entry.settled =
                true;

              this.removeEntry(
                bucket,
                entry,
              );

              reject(
                createAbortError(
                  entry.signal as AbortSignal,
                ),
              );

              this.schedule(
                key,
                bucket,
              );
            };

          entry.signal.addEventListener(
            "abort",
            entry.abortListener,
            {
              once: true,
            },
          );
        }

        bucket.queue.push(
          entry,
        );

        this.schedule(
          key,
          bucket,
        );
      },
    );
  }

  private getBucket(
    key: string,
    now: number,
  ): RateLimitBucket {
    const existing =
      this.buckets.get(key);

    if (
      existing
    ) {
      return existing;
    }

    const created:
      RateLimitBucket = {
        tokens:
          this.burstCapacity,
        lastRefillAt:
          now,
        queue:
          [],
      };

    this.buckets.set(
      key,
      created,
    );

    return created;
  }

  private refill(
    bucket: RateLimitBucket,
    now: number,
  ): void {
    const elapsedMs =
      Math.max(
        0,
        now -
        bucket.lastRefillAt,
      );

    if (
      elapsedMs === 0
    ) {
      return;
    }

    const generatedTokens =
      (
        elapsedMs /
        1_000
      ) *
      this.requestsPerSecond;

    bucket.tokens =
      Math.min(
        this.burstCapacity,
        bucket.tokens +
          generatedTokens,
      );

    bucket.lastRefillAt =
      now;
  }

  private schedule(
    key: string,
    bucket: RateLimitBucket,
  ): void {
    if (
      bucket.timer
    ) {
      clearTimeout(
        bucket.timer,
      );

      bucket.timer =
        undefined;
    }

    this.removeSettledEntries(
      bucket,
    );

    if (
      bucket.queue.length === 0
    ) {
      this.cleanupBucket(
        key,
        bucket,
      );

      return;
    }

    const now =
      Date.now();

    this.refill(
      bucket,
      now,
    );

    this.releaseAvailable(
      key,
      bucket,
      now,
    );

    if (
      bucket.queue.length === 0
    ) {
      this.cleanupBucket(
        key,
        bucket,
      );

      return;
    }

    const missingTokens =
      Math.max(
        0,
        1 -
        bucket.tokens,
      );

    const delayMs =
      Math.max(
        1,
        Math.ceil(
          (
            missingTokens /
            this.requestsPerSecond
          ) *
          1_000,
        ),
      );

    bucket.timer =
      setTimeout(
        () => {
          bucket.timer =
            undefined;

          this.schedule(
            key,
            bucket,
          );
        },
        delayMs,
      );
  }

  private releaseAvailable(
    key: string,
    bucket: RateLimitBucket,
    now: number,
  ): void {
    while (
      bucket.tokens >= 1 &&
      bucket.queue.length > 0
    ) {
      const entry =
        bucket.queue.shift();

      if (
        !entry ||
        entry.settled
      ) {
        continue;
      }

      if (
        entry.signal?.aborted
      ) {
        entry.settled =
          true;

        this.detachAbortListener(
          entry,
        );

        entry.reject(
          createAbortError(
            entry.signal,
          ),
        );

        continue;
      }

      bucket.tokens -=
        1;

      entry.settled =
        true;

      this.detachAbortListener(
        entry,
      );

      entry.resolve({
        key,
        request:
          cloneRequest(
            entry.request,
          ),
        queuedAt:
          entry.queuedAt,
        acquiredAt:
          now,
        waitMs:
          Math.max(
            0,
            now -
            entry.queuedAt,
          ),
      });
    }

    this.cleanupBucket(
      key,
      bucket,
    );
  }

  private removeEntry(
    bucket: RateLimitBucket,
    entry: QueueEntry,
  ): void {
    const index =
      bucket.queue.indexOf(
        entry,
      );

    if (
      index >= 0
    ) {
      bucket.queue.splice(
        index,
        1,
      );
    }

    this.detachAbortListener(
      entry,
    );
  }

  private removeSettledEntries(
    bucket: RateLimitBucket,
  ): void {
    bucket.queue =
      bucket.queue.filter(
        (
          entry,
        ) => !entry.settled,
      );
  }

  private detachAbortListener(
    entry: QueueEntry,
  ): void {
    if (
      entry.signal &&
      entry.abortListener
    ) {
      entry.signal.removeEventListener(
        "abort",
        entry.abortListener,
      );

      entry.abortListener =
        undefined;
    }
  }

  private cleanupBucket(
    key: string,
    bucket: RateLimitBucket,
  ): void {
    if (
      bucket.queue.length > 0
    ) {
      return;
    }

    if (
      bucket.timer
    ) {
      clearTimeout(
        bucket.timer,
      );

      bucket.timer =
        undefined;
    }

    this.buckets.delete(
      key,
    );
  }
}
