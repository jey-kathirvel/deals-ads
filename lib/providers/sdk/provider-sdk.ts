import type {
  HttpRequest,
} from "../../http";

import type {
  ProviderSdk,
  ProviderSdkContext,
  ProviderSdkRequest,
  ProviderSdkRequestFactory,
  ProviderSdkResult,
} from "./provider-sdk-types";

export abstract class BaseProviderSdk<
    TOptions = unknown,
    TResult = unknown,
  >
  implements
    ProviderSdk<
      TOptions,
      TResult
    >
{
  readonly context:
    ProviderSdkContext;

  protected constructor(
    context: ProviderSdkContext,
  ) {
    this.context =
      Object.freeze({
        ...context,
      });
  }

  protected abstract buildRequest(
    request: ProviderSdkRequest<TOptions>,
  ):
    | HttpRequest
    | Promise<HttpRequest>;

  async execute(
    request: ProviderSdkRequest<TOptions>,
  ): Promise<
    ProviderSdkResult<TResult>
  > {
    const started =
      Date.now();

    const httpRequest =
      await this.buildRequest(
        request,
      );

    const response =
      await this.context.httpClient.request<TResult>(
        httpRequest,
      );

    return {
      providerId:
        this.context.providerId,

      operation:
        request.operation,

      durationMs:
        Date.now() -
        started,

      response,
    };
  }
}

export class GenericProviderSdk<
    TOptions = unknown,
    TResult = unknown,
  >
  extends BaseProviderSdk<
    TOptions,
    TResult
  >
{
  private readonly factory:
    ProviderSdkRequestFactory<TOptions>;

  constructor(
    context: ProviderSdkContext,
    factory: ProviderSdkRequestFactory<TOptions>,
  ) {
    super(context);

    this.factory =
      factory;
  }

  protected buildRequest(
    request: ProviderSdkRequest<TOptions>,
  ) {
    return this.factory(
      request,
    );
  }
}
