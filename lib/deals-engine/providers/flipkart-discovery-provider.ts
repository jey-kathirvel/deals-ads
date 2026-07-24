import type {
  DiscoveryContext,
  ProviderDealMapper,
  RawDeal,
} from "../contracts";

import {
  FlipkartDealMapper,
} from "../core";

import {
  BaseHtmlProvider,
} from "./base-html-provider";

import {
  FlipkartSelectorProfile,
} from "./selectors";

export class FlipkartDiscoveryProvider
extends BaseHtmlProvider {

  readonly info = {
    id: "flipkart-india",
    name: "Flipkart India",
    enabled: true,
  } as const;

  constructor(
    private readonly dealMapper:
      ProviderDealMapper =
        new FlipkartDealMapper(),
  ) {
    super();
  }

  protected discoveryUrl(
    context: DiscoveryContext,
  ): string {

    const query =
      encodeURIComponent(
        (
          context as {
            query?: string;
          }
        ).query ?? "deals",
      );

    return (
      "https://www.flipkart.com/search?q=" +
      query
    );
  }

  protected async parseDeals(
    _context: DiscoveryContext,
  ): Promise<RawDeal[]> {

    const extractor =
      this.extractor();

    const products =
      FlipkartSelectorProfile.product.flatMap(
        selector =>
          extractor.many(selector),
      );

    const deals: RawDeal[] = [];

    for (const product of products) {

      const deal =
        this.dealMapper.map(product);

      if (!deal) {
        continue;
      }

      deals.push(deal);
    }

    return deals;
  }
}
