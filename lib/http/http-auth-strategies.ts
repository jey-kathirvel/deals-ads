import type {
  HttpAuthenticationContext,
  HttpAuthenticationResult,
  HttpAuthenticationStrategy,
  HttpCredentialProvider,
} from "./http-auth-types";

export interface ApiKeyCredential {
  apiKey: string;
}

export interface BearerCredential {
  token: string;
}

export interface BasicCredential {
  username: string;
  password: string;
}

export class ApiKeyHeaderAuthentication
  implements HttpAuthenticationStrategy
{
  constructor(
    private readonly provider:
      HttpCredentialProvider<ApiKeyCredential>,
    private readonly headerName = "X-API-Key",
  ) {}

  async authenticate(
    context?: HttpAuthenticationContext,
  ): Promise<HttpAuthenticationResult> {
    const credential =
      await this.provider.getCredential(
        context,
      );

    return {
      headers: {
        [this.headerName]:
          credential.apiKey,
      },
    };
  }
}

export class ApiKeyQueryAuthentication
  implements HttpAuthenticationStrategy
{
  constructor(
    private readonly provider:
      HttpCredentialProvider<ApiKeyCredential>,
    private readonly parameter = "api_key",
  ) {}

  async authenticate(
    context?: HttpAuthenticationContext,
  ): Promise<HttpAuthenticationResult> {
    const credential =
      await this.provider.getCredential(
        context,
      );

    return {
      query: {
        [this.parameter]:
          credential.apiKey,
      },
    };
  }
}

export class BearerAuthentication
  implements HttpAuthenticationStrategy
{
  constructor(
    private readonly provider:
      HttpCredentialProvider<BearerCredential>,
  ) {}

  async authenticate(
    context?: HttpAuthenticationContext,
  ): Promise<HttpAuthenticationResult> {
    const credential =
      await this.provider.getCredential(
        context,
      );

    return {
      headers: {
        Authorization:
          `Bearer ${credential.token}`,
      },
    };
  }
}

export class BasicAuthentication
  implements HttpAuthenticationStrategy
{
  constructor(
    private readonly provider:
      HttpCredentialProvider<BasicCredential>,
  ) {}

  async authenticate(
    context?: HttpAuthenticationContext,
  ): Promise<HttpAuthenticationResult> {
    const credential =
      await this.provider.getCredential(
        context,
      );

    const encoded =
      Buffer.from(
        `${credential.username}:${credential.password}`,
      ).toString(
        "base64",
      );

    return {
      headers: {
        Authorization:
          `Basic ${encoded}`,
      },
    };
  }
}
