import type {
  DiscoveryContext,
  ProviderDiscoveryResult,
  ProviderExtractorFactory,
  ProviderHtmlParser,
  ProviderHttpClient,
  RawDeal,
} from "../contracts";

import {
  CheerioHtmlParser,
  DefaultProviderExtractorFactory,
  DefaultProviderNormalizer,
  FetchProviderHttpClient,
  ProviderDocumentLoader,
} from "../core";

export abstract class BaseHtmlProvider {

  protected readonly httpClient: ProviderHttpClient;
  protected readonly parser: ProviderHtmlParser;
  protected readonly extractorFactory: ProviderExtractorFactory;
  protected readonly normalizer =
    new DefaultProviderNormalizer();

  protected constructor(
    httpClient: ProviderHttpClient =
      new FetchProviderHttpClient(),

    parser: ProviderHtmlParser =
      new CheerioHtmlParser(),

    extractorFactory: ProviderExtractorFactory =
      new DefaultProviderExtractorFactory(),
  ) {
    this.httpClient = httpClient;
    this.parser = parser;
    this.extractorFactory = extractorFactory;
  }

  abstract readonly info: {
    id: string;
    name: string;
    enabled: boolean;
  };

  protected abstract discoveryUrl(
    context: DiscoveryContext,
  ): string;

  protected abstract parseDeals(
    context: DiscoveryContext,
  ): Promise<RawDeal[]>;

  async discover(
    context: DiscoveryContext,
  ): Promise<ProviderDiscoveryResult> {

    const startedAt = Date.now();

    try {

      const loader =
        new ProviderDocumentLoader(
          this.httpClient,
        );

      const document =
        await loader.load(
          this.discoveryUrl(context),
        );

      await this.parser.load(document);

      const deals =
        await this.parseDeals(context);

      return {
        providerId:
          this.info.id,

        providerName:
          this.info.name,

        success: true,

        discovered:
          deals.length,

        deals,

        errors: [],

        durationMs:
          Date.now() - startedAt,
      };

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        providerId:
          this.info.id,

        providerName:
          this.info.name,

        success: false,

        discovered: 0,

        deals: [],

        errors: [
          message,
        ],

        durationMs:
          Date.now() - startedAt,
      };
    }
  }

  protected extractor() {
    return this.extractorFactory.create(
      this.parser,
    );
  }
}
