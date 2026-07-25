import type {
  HttpHeaders,
  HttpQuery,
  HttpQueryValue,
  HttpRequest,
  HttpRequestDefaults,
} from "./http-types";

function normalizeHeaderValue(
  value:
    string | number | boolean,
): string {
  return String(
    value,
  );
}

export function normalizeHeaders(
  headers:
    HttpHeaders = {},
): Record<string, string> {
  const normalized:
    Record<string, string> = {};

  for (
    const [
      name,
      value,
    ] of Object.entries(
      headers,
    )
  ) {
    const normalizedName =
      name
        .trim()
        .toLowerCase();

    if (
      normalizedName.length === 0
    ) {
      throw new Error(
        "HTTP header name must not be empty",
      );
    }

    normalized[
      normalizedName
    ] =
      normalizeHeaderValue(
        value,
      );
  }

  return normalized;
}

export function mergeHeaders(
  ...sources:
    Array<
      HttpHeaders | undefined
    >
): Record<string, string> {
  const merged:
    Record<string, string> = {};

  for (
    const source of sources
  ) {
    Object.assign(
      merged,
      normalizeHeaders(
        source,
      ),
    );
  }

  return merged;
}

function appendQueryValue(
  searchParams:
    URLSearchParams,
  key: string,
  value:
    HttpQueryValue,
): void {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  searchParams.append(
    key,
    String(
      value,
    ),
  );
}

export function appendQuery(
  url: string,
  query:
    HttpQuery = {},
): string {
  const parsed =
    new URL(
      url,
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      query,
    )
  ) {
    if (
      key.trim().length === 0
    ) {
      throw new Error(
        "HTTP query key must not be empty",
      );
    }

    appendQueryValue(
      parsed.searchParams,
      key,
      value,
    );
  }

  return parsed.toString();
}

export function validateTimeout(
  timeoutMs:
    number | undefined,
): void {
  if (
    timeoutMs === undefined
  ) {
    return;
  }

  if (
    !Number.isFinite(
      timeoutMs,
    ) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      "HTTP timeoutMs must be greater than 0",
    );
  }
}

export function validateRequest(
  request:
    HttpRequest,
): void {
  if (
    request.url.trim().length === 0
  ) {
    throw new Error(
      "HTTP request URL must not be empty",
    );
  }

  new URL(
    request.url,
  );

  validateTimeout(
    request.timeoutMs,
  );
}

export function applyRequestDefaults(
  request:
    HttpRequest,
  defaults:
    HttpRequestDefaults = {},
): HttpRequest {
  const headers =
    mergeHeaders(
      defaults.headers,
      request.headers,
    );

  const userAgent =
    request.userAgent ??
    defaults.userAgent;

  if (
    userAgent
  ) {
    headers[
      "user-agent"
    ] =
      userAgent;
  }

  const resolved:
    HttpRequest = {
      ...request,

      headers,

      timeoutMs:
        request.timeoutMs ??
        defaults.timeoutMs,

      userAgent,
    };

  validateRequest(
    resolved,
  );

  return resolved;
}

export function cloneRequest(
  request:
    HttpRequest,
): HttpRequest {
  return {
    ...request,

    headers:
      request.headers
        ? {
            ...request.headers,
          }
        : undefined,

    query:
      request.query
        ? {
            ...request.query,
          }
        : undefined,

    body:
      request.body instanceof Uint8Array
        ? new Uint8Array(
            request.body,
          )
        : request.body,
  };
}
