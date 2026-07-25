import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "../../http";

export interface ProviderSdkContext {
  providerId: string;
  providerName: string;
  providerVersion: string;
  httpClient: HttpClient;
}

export interface ProviderSdkRequest<
  TOptions = unknown,
> {
  operation: string;
  options: TOptions;
}

export interface ProviderSdkResult<
  TData = unknown,
> {
  providerId: string;
  operation: string;
  durationMs: number;
  response: HttpResponse<TData>;
}

export interface ProviderSdk<
  TOptions = unknown,
  TResult = unknown,
> {
  readonly context: ProviderSdkContext;

  execute(
    request: ProviderSdkRequest<TOptions>,
  ): Promise<
    ProviderSdkResult<TResult>
  >;
}

export interface ProviderSdkRequestFactory<
  TOptions = unknown,
> {
  (
    request: ProviderSdkRequest<TOptions>,
  ): Promise<HttpRequest> | HttpRequest;
}
