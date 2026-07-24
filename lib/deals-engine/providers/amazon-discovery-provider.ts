import type {
  DiscoveryContext,
  ProviderDealMapper,
  RawDeal,
} from "../contracts";

import {
  AmazonDealMapper,
} from "../core";

import {
  BaseHtmlProvider,
} from "./base-html-provider";

import {
  AmazonSelectorProfile,
} from "./selectors";

export class AmazonDiscoveryProvider
extends BaseHtmlProvider {

  readonly info = {
    id: "amazon-india",
    name: "Amazon India",
    enabled: true,
  } as const;

  constructor(
    private readonly dealMapper:
      ProviderDealMapper =
        new AmazonDealMapper(),
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
      "https://www.amazon.in/s?k=" +
      query
    );
  }

  protected async parseDeals(
    _context: DiscoveryContext,
  ): Promise<RawDeal[]> {

    const extractor =
      this.extractor();

    const selectors =
      AmazonSelectorProfile.product;

    const products =
      selectors.flatMap(
        selector =>
          extractor.many(selector),
      );

    const deals: RawDeal[] = [];

    for (
      const product of products
    ) {
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
