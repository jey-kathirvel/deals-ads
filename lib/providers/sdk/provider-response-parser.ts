import type {
  HttpResponse,
} from "../../http";

export interface ProviderResponseParserContext {
  providerId: string;
  operation: string;
}

export interface ProviderResponseParser<
  TBody = unknown,
  TResult = TBody,
> {
  parse(
    response: HttpResponse<TBody>,
    context: ProviderResponseParserContext,
  ): TResult | Promise<TResult>;
}

export interface ProviderResponseParserOptions<
  TBody,
  TResult,
> {
  parseBody(
    body: TBody,
    response: HttpResponse<TBody>,
    context: ProviderResponseParserContext,
  ): TResult | Promise<TResult>;

  isSuccessfulStatus?(
    status: number,
    response: HttpResponse<TBody>,
  ): boolean;

  allowEmptyBody?: boolean;
}

export interface ProviderResponseErrorDetails {
  providerId: string;
  operation: string;
  status?: number;
  statusText?: string;
  url?: string;
  cause?: unknown;
}

export class ProviderResponseParseError
  extends Error
{
  readonly providerId:
    string;

  readonly operation:
    string;

  readonly status?:
    number;

  readonly statusText?:
    string;

  readonly url?:
    string;

  readonly cause?:
    unknown;

  constructor(
    message: string,
    details: ProviderResponseErrorDetails,
  ) {
    super(message);

    this.name =
      "ProviderResponseParseError";

    this.providerId =
      details.providerId;

    this.operation =
      details.operation;

    this.status =
      details.status;

    this.statusText =
      details.statusText;

    this.url =
      details.url;

    this.cause =
      details.cause;
  }
}

function validateContext(
  context: ProviderResponseParserContext,
): ProviderResponseParserContext {
  const providerId =
    context.providerId.trim();

  const operation =
    context.operation.trim();

  if (
    providerId.length === 0
  ) {
    throw new ProviderResponseParseError(
      "Provider response parser providerId cannot be empty",
      {
        providerId,
        operation,
      },
    );
  }

  if (
    operation.length === 0
  ) {
    throw new ProviderResponseParseError(
      "Provider response parser operation cannot be empty",
      {
        providerId,
        operation,
      },
    );
  }

  return {
    providerId,
    operation,
  };
}

function defaultSuccessfulStatus(
  status: number,
): boolean {
  return (
    status >= 200 &&
    status < 300
  );
}

export function assertSuccessfulProviderResponse<
  TBody,
>(
  response: HttpResponse<TBody>,
  context: ProviderResponseParserContext,
  isSuccessfulStatus:
    | ((
        status: number,
        response: HttpResponse<TBody>,
      ) => boolean)
    | undefined = undefined,
): void {
  const normalizedContext =
    validateContext(
      context,
    );

  const successful =
    (
      isSuccessfulStatus ??
      defaultSuccessfulStatus
    )(
      response.status,
      response,
    );

  if (
    successful
  ) {
    return;
  }

  throw new ProviderResponseParseError(
    `Provider "${normalizedContext.providerId}" operation "${normalizedContext.operation}" returned HTTP ${response.status}`,
    {
      providerId:
        normalizedContext.providerId,

      operation:
        normalizedContext.operation,

      status:
        response.status,

      statusText:
        response.statusText,

      url:
        response.url,
    },
  );
}

export function requireProviderResponseBody<
  TBody,
>(
  response: HttpResponse<TBody>,
  context: ProviderResponseParserContext,
): NonNullable<TBody> {
  const normalizedContext =
    validateContext(
      context,
    );

  const body =
    response.body;

  if (
    body === undefined ||
    body === null
  ) {
    throw new ProviderResponseParseError(
      `Provider "${normalizedContext.providerId}" operation "${normalizedContext.operation}" returned an empty response body`,
      {
        providerId:
          normalizedContext.providerId,

        operation:
          normalizedContext.operation,

        status:
          response.status,

        statusText:
          response.statusText,

        url:
          response.url,
      },
    );
  }

  return body as NonNullable<TBody>;
}

export class DefaultProviderResponseParser<
    TBody,
    TResult,
  >
  implements
    ProviderResponseParser<
      TBody,
      TResult
    >
{
  private readonly options:
    ProviderResponseParserOptions<
      TBody,
      TResult
    >;

  constructor(
    options:
      ProviderResponseParserOptions<
        TBody,
        TResult
      >,
  ) {
    if (
      typeof options.parseBody !==
      "function"
    ) {
      throw new Error(
        "Provider response parser parseBody must be a function",
      );
    }

    this.options = {
      ...options,
    };
  }

  async parse(
    response: HttpResponse<TBody>,
    context: ProviderResponseParserContext,
  ): Promise<TResult> {
    const normalizedContext =
      validateContext(
        context,
      );

    const responseStatus =
      response.status;

    const responseStatusText =
      response.statusText;

    const responseUrl =
      response.url;

    assertSuccessfulProviderResponse(
      response,
      normalizedContext,
      this.options
        .isSuccessfulStatus,
    );

    const body =
      this.options.allowEmptyBody === true
        ? response.body
        : requireProviderResponseBody(
            response,
            normalizedContext,
          );

    try {
      return await this.options.parseBody(
        body as TBody,
        response,
        normalizedContext,
      );
    } catch (
      error
    ) {
      if (
        error instanceof
        ProviderResponseParseError
      ) {
        throw error;
      }

      throw new ProviderResponseParseError(
        `Failed to parse provider "${normalizedContext.providerId}" operation "${normalizedContext.operation}" response`,
        {
          providerId:
            normalizedContext.providerId,

          operation:
            normalizedContext.operation,

          status:
            responseStatus,

          statusText:
            responseStatusText,

          url:
            responseUrl,

          cause:
            error,
        },
      );
    }
  }
}

export function createProviderResponseParser<
  TBody,
  TResult,
>(
  options:
    ProviderResponseParserOptions<
      TBody,
      TResult
    >,
): ProviderResponseParser<
  TBody,
  TResult
> {
  return new DefaultProviderResponseParser(
    options,
  );
}

export function createIdentityProviderResponseParser<
  TBody,
>(
  options: Omit<
    ProviderResponseParserOptions<
      TBody,
      TBody
    >,
    "parseBody"
  > = {},
): ProviderResponseParser<
  TBody,
  TBody
> {
  return createProviderResponseParser({
    ...options,

    parseBody(
      body,
    ) {
      return body;
    },
  });
}
