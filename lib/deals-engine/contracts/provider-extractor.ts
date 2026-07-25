import type {
  ProviderElement,
  ProviderHtmlParser,
} from "./provider-html-parser";

export interface ProviderExtractor {

  one(
    selector: string,
  ): ProviderElement | undefined;

  many(
    selector: string,
  ): ProviderElement[];

  text(
    selector: string,
  ): string | undefined;

  html(
    selector: string,
  ): string | undefined;

  attribute(
    selector: string,
    attribute: string,
  ): string | undefined;
}

export interface ProviderExtractorFactory {

  create(
    parser: ProviderHtmlParser,
  ): ProviderExtractor;
}
