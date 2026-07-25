import type {
  DealProvider,
} from "./provider";

export class ProviderRegistry {

  private readonly providers =
    new Map<string, DealProvider>();

  register(
    provider: DealProvider,
  ): void {

    this.providers.set(
      provider.metadata().id,
      provider,
    );

  }

  get(
    id: string,
  ): DealProvider | undefined {

    return this.providers.get(id);

  }

  list(): DealProvider[] {

    return [
      ...this.providers.values(),
    ].sort(
      (
        a,
        b,
      ) =>
        a.metadata().priority -
        b.metadata().priority,
    );

  }

}
