import type {
  HttpHeaders,
  HttpQuery,
} from "./http-types";

export interface HttpAuthenticationResult {
  headers?: HttpHeaders;
  query?: HttpQuery;
}

export interface HttpAuthenticationContext {
  provider?: string;
}

export interface HttpCredentialProvider<TCredential> {
  getCredential(
    context?: HttpAuthenticationContext,
  ): Promise<TCredential> | TCredential;
}

export interface HttpAuthenticationStrategy {
  authenticate(
    context?: HttpAuthenticationContext,
  ): Promise<HttpAuthenticationResult>;
}
