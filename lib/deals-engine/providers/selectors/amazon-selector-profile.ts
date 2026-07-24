import type {
  ProviderSelectorProfile,
} from "../../contracts";

export const AmazonSelectorProfile:
ProviderSelectorProfile = {

  product: [
    "[data-component-type='s-search-result']",
    ".s-result-item",
  ],

  title: [
    "h2 span",
    ".a-size-medium",
  ],

  currentPrice: [
    ".a-price .a-offscreen",
    ".a-price-whole",
  ],

  originalPrice: [
    ".a-text-price .a-offscreen",
    ".a-price.a-text-price .a-offscreen",
  ],

  image: [
    "img.s-image",
  ],

  link: [
    "h2 a",
    "a.a-link-normal",
  ],

  rating: [
    ".a-icon-alt",
  ],

  reviewCount: [
    ".a-size-base.s-underline-text",
  ],

  discount: [
    ".savingsPercentage",
  ],
};
