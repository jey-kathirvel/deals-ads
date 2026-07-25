import type { DiscoveryProvider } from "./discovery-provider";

export interface ProviderRegistry {
  register(provider: DiscoveryProvider): void;

  unregister(providerId: string): void;

  get(providerId: string): DiscoveryProvider | undefined;

  getEnabled(): DiscoveryProvider[];

  getAll(): DiscoveryProvider[];
}
