import type {
  ProviderDealMapper,
  ProviderElement,
  RawDeal,
} from "../contracts";

import {
  Category,
  Retailer,
} from "../models";

import {
  FlipkartSelectorProfile,
} from "../providers/selectors";

export class FlipkartDealMapper
implements ProviderDealMapper {

  map(
    element: ProviderElement,
  ): RawDeal | null {

    const title =
      this.firstText(
        element,
        FlipkartSelectorProfile.title,
      );

    const currentPrice =
      this.firstMoney(
        element,
        FlipkartSelectorProfile.currentPrice,
      );

    const originalPrice =
      this.firstMoney(
        element,
        FlipkartSelectorProfile.originalPrice,
      ) ?? currentPrice;

    const imageUrl =
      this.firstAttribute(
        element,
        FlipkartSelectorProfile.image,
        "src",
      ) ??
      this.firstAttribute(
        element,
        FlipkartSelectorProfile.image,
        "data-src",
      ) ??
      "";

    const rawLink =
      this.firstAttribute(
        element,
        FlipkartSelectorProfile.link,
        "href",
      );

    const dealUrl =
      this.absoluteUrl(
        rawLink,
        "https://www.flipkart.com",
      );

    const discountFromPage =
      this.firstPercentage(
        element,
        FlipkartSelectorProfile.discount,
      );

    const discountPercent =
      discountFromPage ??
      this.calculateDiscount(
        currentPrice,
        originalPrice,
      );

    if (
      !title ||
      !currentPrice ||
      !imageUrl ||
      !dealUrl
    ) {
      return null;
    }

    return {
      title,

      retailer:
        Retailer.FLIPKART,

      category:
        Object.values(Category)[0] as Category,

      currentPrice,

      originalPrice:
        originalPrice ?? currentPrice,

      discountPercent,

      imageUrl,

      dealUrl,

      source:
        "flipkart-india",

      discoveredAt:
        new Date(),

      expiresAt:
        new Date(
          Date.now() +
          24 * 60 * 60 * 1000,
        ),
    };
  }

  private firstText(
    element: ProviderElement,
    selectors: string[],
  ): string | undefined {

    for (const selector of selectors) {

      const value =
        element
          .first(selector)
          ?.text()
          .replace(/\s+/g, " ")
          .trim();

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private firstAttribute(
    element: ProviderElement,
    selectors: string[],
    attribute: string,
  ): string | undefined {

    for (const selector of selectors) {

      const value =
        element
          .first(selector)
          ?.attr(attribute)
          ?.trim();

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private firstMoney(
    element: ProviderElement,
    selectors: string[],
  ): number | undefined {

    const value =
      this.firstText(
        element,
        selectors,
      );

    if (!value) {
      return undefined;
    }

    const parsed =
      Number(
        value.replace(
          /[^0-9.]/g,
          "",
        ),
      );

    return Number.isFinite(parsed) &&
      parsed > 0
      ? parsed
      : undefined;
  }

  private firstPercentage(
    element: ProviderElement,
    selectors: string[],
  ): number | undefined {

    const value =
      this.firstText(
        element,
        selectors,
      );

    if (!value) {
      return undefined;
    }

    const match =
      value.match(
        /(\d+(?:\.\d+)?)/,
      );

    if (!match) {
      return undefined;
    }

    const parsed =
      Number(match[1]);

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  private calculateDiscount(
    currentPrice?: number,
    originalPrice?: number,
  ): number {

    if (
      !currentPrice ||
      !originalPrice ||
      originalPrice <= currentPrice
    ) {
      return 0;
    }

    return Math.round(
      (
        (
          originalPrice -
          currentPrice
        ) /
        originalPrice
      ) *
      100,
    );
  }

  private absoluteUrl(
    value: string | undefined,
    baseUrl: string,
  ): string {

    if (!value) {
      return "";
    }

    try {
      return new URL(
        value,
        baseUrl,
      ).toString();
    } catch {
      return "";
    }
  }
}
