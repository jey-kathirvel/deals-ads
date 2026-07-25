export interface ProviderHttpRequest {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface ProviderHttpResponse {
  url: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}

export interface ProviderHttpClient {
  request(
    request: ProviderHttpRequest,
  ): Promise<ProviderHttpResponse>;
}

export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}
