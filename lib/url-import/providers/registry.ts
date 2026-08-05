import type { UrlImportProvider } from "./types";
import { genericProvider } from "./generic-provider";
import { zeptoProvider } from "./zepto-provider";

const providers: UrlImportProvider[] = [zeptoProvider];

export function resolveProvider(url: URL): UrlImportProvider {
  return providers.find((provider) => provider.supports(url)) ?? genericProvider;
}

export function listProviders() { return [...providers, genericProvider]; }
