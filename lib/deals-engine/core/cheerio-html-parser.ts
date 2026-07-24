import {
  load,
  type Cheerio,
  type CheerioAPI,
} from "cheerio";

import type {
  ProviderDocument,
  ProviderElement,
  ProviderHtmlParser,
} from "../contracts";

class CheerioElement
implements ProviderElement {

  constructor(
    private readonly api: CheerioAPI,
    private readonly element: Cheerio<any>,
  ) {}

  text(): string {
    return this.element.text();
  }

  html(): string {
    return this.element.html() ?? "";
  }

  attr(
    name: string,
  ): string | undefined {
    return this.element.attr(name);
  }

  first(
    selector: string,
  ): ProviderElement | undefined {

    const match =
      this.element.find(selector).first();

    if (match.length === 0) {
      return undefined;
    }

    return new CheerioElement(
      this.api,
      match,
    );
  }

  select(
    selector: string,
  ): ProviderElement[] {

    return this.element
      .find(selector)
      .toArray()
      .map(
        node =>
          new CheerioElement(
            this.api,
            this.api(node),
          ),
      );
  }
}

export class CheerioHtmlParser
implements ProviderHtmlParser {

  private api: CheerioAPI | undefined;

  async load(
    document: ProviderDocument,
  ): Promise<void> {

    this.api =
      load(document.html);
  }

  select(
    selector: string,
  ): ProviderElement[] {

    const api =
      this.requireApi();

    return api(selector)
      .toArray()
      .map(
        node =>
          new CheerioElement(
            api,
            api(node),
          ),
      );
  }

  first(
    selector: string,
  ): ProviderElement | undefined {

    const api =
      this.requireApi();

    const match =
      api(selector).first();

    if (match.length === 0) {
      return undefined;
    }

    return new CheerioElement(
      api,
      match,
    );
  }

  private requireApi(): CheerioAPI {

    if (!this.api) {
      throw new Error(
        "Provider HTML document has not been loaded.",
      );
    }

    return this.api;
  }
}
