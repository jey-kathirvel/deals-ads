export interface ProviderNormalizer {
  text(value: string | undefined | null): string;
  price(value: string | number | undefined | null): number;
  percentage(value: string | number | undefined | null): number;
  url(baseUrl: string, value: string | undefined | null): string;
}
