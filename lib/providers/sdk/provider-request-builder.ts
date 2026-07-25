import type {
  HttpBody,
  HttpHeaderValue,
  HttpMethod,
  HttpQueryValue,
  HttpRequest,
} from "../../http";

export interface ProviderRequestBuilderOptions {
  baseUrl: string;
  defaultHeaders?: Record<
    string,
    HttpHeaderValue
  >;
  defaultQuery?: Record<
    string,
    HttpQueryValue
  >;
}

export interface ProviderRequestInput {
  method: HttpMethod;
  path?: string;
  url?: string;
  headers?: Record<
    string,
    HttpHeaderValue
  >;
  query?: Record<
    string,
    HttpQueryValue
  >;
  body?: HttpBody;
  signal?: AbortSignal;
}

function normalizeBaseUrl(
  baseUrl: string,
): string {
  const normalized =
    baseUrl.trim();

  if (
    normalized.length === 0
  ) {
    throw new Error(
      "Provider request baseUrl cannot be empty",
    );
  }

  return normalized.replace(
    /\/+$/,
    "",
  );
}

function normalizePath(
  path: string,
): string {
  const normalized =
    path.trim();

  if (
    normalized.length === 0
  ) {
    return "";
  }

  return normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;
}

function normalizeAbsoluteUrl(
  url: string,
): string {
  const normalized =
    url.trim();

  if (
    normalized.length === 0
  ) {
    throw new Error(
      "Provider request URL cannot be empty",
    );
  }

  return normalized;
}

function cloneRecord<
  TValue,
>(
  value:
    | Record<string, TValue>
    | undefined,
): Record<string, TValue> {
  return {
    ...(value ?? {}),
  };
}

export class ProviderRequestBuilder {
  private readonly baseUrl:
    string;

  private readonly defaultHeaders:
    Record<
      string,
      HttpHeaderValue
    >;

  private readonly defaultQuery:
    Record<
      string,
      HttpQueryValue
    >;

  constructor(
    options: ProviderRequestBuilderOptions,
  ) {
    this.baseUrl =
      normalizeBaseUrl(
        options.baseUrl,
      );

    this.defaultHeaders =
      cloneRecord(
        options.defaultHeaders,
      );

    this.defaultQuery =
      cloneRecord(
        options.defaultQuery,
      );
  }

  build(
    input: ProviderRequestInput,
  ): HttpRequest {
    if (
      input.path !== undefined &&
      input.url !== undefined
    ) {
      throw new Error(
        "Provider request cannot use both path and url",
      );
    }

    const url =
      input.url === undefined
        ? `${this.baseUrl}${normalizePath(input.path ?? "")}`
        : normalizeAbsoluteUrl(
            input.url,
          );

    const request:
      HttpRequest = {
        method:
          input.method,
        url,
        headers: {
          ...this.defaultHeaders,
          ...cloneRecord(
            input.headers,
          ),
        },
        query: {
          ...this.defaultQuery,
          ...cloneRecord(
            input.query,
          ),
        },
      };

    if (
      input.body !== undefined
    ) {
      request.body =
        input.body;
    }

    if (
      input.signal !== undefined
    ) {
      request.signal =
        input.signal;
    }

    return request;
  }

  get(
    path: string,
    input: Omit<
      ProviderRequestInput,
      "method" | "path" | "url"
    > = {},
  ): HttpRequest {
    return this.build({
      ...input,
      method:
        "GET",
      path,
    });
  }

  post(
    path: string,
    input: Omit<
      ProviderRequestInput,
      "method" | "path" | "url"
    > = {},
  ): HttpRequest {
    return this.build({
      ...input,
      method:
        "POST",
      path,
    });
  }

  put(
    path: string,
    input: Omit<
      ProviderRequestInput,
      "method" | "path" | "url"
    > = {},
  ): HttpRequest {
    return this.build({
      ...input,
      method:
        "PUT",
      path,
    });
  }

  patch(
    path: string,
    input: Omit<
      ProviderRequestInput,
      "method" | "path" | "url"
    > = {},
  ): HttpRequest {
    return this.build({
      ...input,
      method:
        "PATCH",
      path,
    });
  }

  delete(
    path: string,
    input: Omit<
      ProviderRequestInput,
      "method" | "path" | "url"
    > = {},
  ): HttpRequest {
    return this.build({
      ...input,
      method:
        "DELETE",
      path,
    });
  }
}

export function createProviderRequestBuilder(
  options: ProviderRequestBuilderOptions,
): ProviderRequestBuilder {
  return new ProviderRequestBuilder(
    options,
  );
}
