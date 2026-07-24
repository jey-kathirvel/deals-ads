import type {
  DiscoveryProvider,
  ProviderRegistry,
} from "../contracts";

export class InMemoryProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<string, DiscoveryProvider>();

  register(provider: DiscoveryProvider): void {
    const providerId = provider.info.id.trim();

    if (!providerId) {
      throw new Error("Provider id is required");
    }

    if (this.providers.has(providerId)) {
      throw new Error(`Provider already registered: ${providerId}`);
    }

    this.providers.set(providerId, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  get(providerId: string): DiscoveryProvider | undefined {
    return this.providers.get(providerId);
  }

  getEnabled(): DiscoveryProvider[] {
    return this.getAll().filter(
      (provider) => provider.info.enabled,
    );
  }

  getAll(): DiscoveryProvider[] {
    return Array.from(this.providers.values());
  }
}
