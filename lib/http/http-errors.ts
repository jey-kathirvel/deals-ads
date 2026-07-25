import type {
  HttpRequest,
} from "./http-types";

export interface HttpErrorOptions {
  request: HttpRequest;
  cause?: unknown;
}

export class HttpError extends Error {
  readonly request:
    HttpRequest;

  readonly cause?:
    unknown;

  constructor(
    message: string,
    options: HttpErrorOptions,
  ) {
    super(message);

    this.name =
      "HttpError";

    this.request =
      options.request;

    this.cause =
      options.cause;
  }
}

export class HttpTimeoutError
  extends HttpError {
  readonly timeoutMs:
    number;

  constructor(
    request: HttpRequest,
    timeoutMs: number,
    cause?: unknown,
  ) {
    super(
      `HTTP request timed out after ${timeoutMs}ms`,
      {
        request,
        cause,
      },
    );

    this.name =
      "HttpTimeoutError";

    this.timeoutMs =
      timeoutMs;
  }
}

export class HttpNetworkError
  extends HttpError {
  constructor(
    request: HttpRequest,
    cause?: unknown,
  ) {
    super(
      "HTTP request failed due to a network error",
      {
        request,
        cause,
      },
    );

    this.name =
      "HttpNetworkError";
  }
}
