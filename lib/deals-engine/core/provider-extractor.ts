import type {
  ProviderElement,
  ProviderExtractor,
  ProviderExtractorFactory,
  ProviderHtmlParser,
} from "../contracts";

export class DefaultProviderExtractor
implements ProviderExtractor {

  constructor(
    private readonly parser: ProviderHtmlParser,
  ) {}

  one(
    selector: string,
  ): ProviderElement | undefined {

    return this.parser.first(selector);
  }

  many(
    selector: string,
  ): ProviderElement[] {

    return this.parser.select(selector);
  }

  text(
    selector: string,
  ): string | undefined {

    return this.one(selector)?.text();
  }

  html(
    selector: string,
  ): string | undefined {

    return this.one(selector)?.html();
  }

  attribute(
    selector: string,
    attribute: string,
  ): string | undefined {

    return this
      .one(selector)
      ?.attr(attribute);
  }
}

export class DefaultProviderExtractorFactory
implements ProviderExtractorFactory {

  create(
    parser: ProviderHtmlParser,
  ): ProviderExtractor {

    return new DefaultProviderExtractor(
      parser,
    );
  }
}
