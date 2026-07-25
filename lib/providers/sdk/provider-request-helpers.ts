import type {
  HttpBody,
  HttpHeaderValue,
  HttpQueryValue,
  HttpRequest,
} from "../../http";

function cloneRequest(
  request: HttpRequest,
): HttpRequest {
  return {
    ...request,
    headers: {
      ...(request.headers ?? {}),
    },
    query: {
      ...(request.query ?? {}),
    },
  };
}

export function withProviderHeaders(
  request: HttpRequest,
  headers: Record<
    string,
    HttpHeaderValue
  >,
): HttpRequest {
  const cloned =
    cloneRequest(request);

  cloned.headers = {
    ...cloned.headers,
    ...headers,
  };

  return cloned;
}

export function withProviderQuery(
  request: HttpRequest,
  query: Record<
    string,
    HttpQueryValue
  >,
): HttpRequest {
  const cloned =
    cloneRequest(request);

  cloned.query = {
    ...cloned.query,
    ...query,
  };

  return cloned;
}

export function withJsonBody<TBody extends HttpBody>(
  request: HttpRequest,
  body: TBody,
): HttpRequest {
  return {
    ...withProviderHeaders(
      request,
      {
        "Content-Type":
          "application/json",
        Accept:
          "application/json",
      },
    ),
    body,
  };
}

export function withProviderUserAgent(
  request: HttpRequest,
  providerId: string,
  version: string,
): HttpRequest {
  const normalizedProviderId =
    providerId.trim();

  const normalizedVersion =
    version.trim();

  if (
    normalizedProviderId.length === 0
  ) {
    throw new Error(
      "Provider user-agent providerId cannot be empty",
    );
  }

  if (
    normalizedVersion.length === 0
  ) {
    throw new Error(
      "Provider user-agent version cannot be empty",
    );
  }

  return withProviderHeaders(
    request,
    {
      "User-Agent":
        `deals-engine/${normalizedProviderId}/${normalizedVersion}`,
    },
  );
}
