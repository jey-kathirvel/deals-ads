export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type HttpHeaderValue =
  | string
  | number
  | boolean;

export type HttpHeaders =
  Record<
    string,
    HttpHeaderValue
  >;

export type HttpQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type HttpQuery =
  Record<
    string,
    HttpQueryValue
  >;

export type HttpBody =
  | string
  | Uint8Array
  | Record<string, unknown>
  | unknown[]
  | null;

export interface HttpRequest {
  method: HttpMethod;
  url: string;

  headers?: HttpHeaders;
  query?: HttpQuery;
  body?: HttpBody;

  timeoutMs?: number;
  userAgent?: string;

  signal?: AbortSignal;
}

export interface HttpResponse<TBody = unknown> {
  status: number;
  statusText: string;
  url: string;

  headers:
    Record<
      string,
      string
    >;

  body: TBody;

  durationMs: number;
}

export interface HttpClient {
  request<TBody = unknown>(
    request: HttpRequest,
  ): Promise<HttpResponse<TBody>>;
}

export interface HttpRequestDefaults {
  headers?: HttpHeaders;
  timeoutMs?: number;
  userAgent?: string;
}

export interface HttpClientOptions {
  defaults?: HttpRequestDefaults;
}
