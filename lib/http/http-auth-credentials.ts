import type {
  HttpAuthenticationContext,
  HttpCredentialProvider,
} from "./http-auth-types";

export class StaticCredentialProvider<T>
  implements HttpCredentialProvider<T>
{
  constructor(
    private readonly credential: T,
  ) {}

  getCredential(
    _context?: HttpAuthenticationContext,
  ): T {
    return this.credential;
  }
}

export class CallbackCredentialProvider<T>
  implements HttpCredentialProvider<T>
{
  constructor(
    private readonly callback: (
      context?: HttpAuthenticationContext,
    ) => Promise<T> | T,
  ) {}

  getCredential(
    context?: HttpAuthenticationContext,
  ): Promise<T> | T {
    return this.callback(
      context,
    );
  }
}
