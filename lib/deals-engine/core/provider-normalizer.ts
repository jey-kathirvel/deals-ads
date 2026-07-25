import type {
  ProviderNormalizer,
} from "../contracts";

export class DefaultProviderNormalizer
implements ProviderNormalizer {

  text(
    value: string | undefined | null,
  ): string {

    return (value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  price(
    value: string | number | undefined | null,
  ): number {

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    const normalized =
      (value ?? "")
        .replace(/[₹,$,]/g, "")
        .replace(/[^0-9.]/g, "");

    const amount =
      Number.parseFloat(normalized);

    return Number.isFinite(amount)
      ? amount
      : 0;
  }

  percentage(
    value: string | number | undefined | null,
  ): number {

    if (typeof value === "number") {
      return Number.isFinite(value)
        ? value
        : 0;
    }

    const normalized =
      (value ?? "")
        .replace("%", "")
        .trim();

    const percent =
      Number.parseFloat(normalized);

    return Number.isFinite(percent)
      ? percent
      : 0;
  }

  url(
    baseUrl: string,
    value: string | undefined | null,
  ): string {

    const url =
      (value ?? "").trim();

    if (!url) {
      return "";
    }

    try {
      return new URL(
        url,
        baseUrl,
      ).toString();
    } catch {
      return "";
    }
  }
}
