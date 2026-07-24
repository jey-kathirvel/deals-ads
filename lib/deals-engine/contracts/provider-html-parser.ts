import type {
  ProviderDocument,
} from "./provider-document";

export interface ProviderElement {

  text(): string;

  html(): string;

  attr(
    name: string,
  ): string | undefined;

  first(
    selector: string,
  ): ProviderElement | undefined;

  select(
    selector: string,
  ): ProviderElement[];
}

export interface ProviderHtmlParser {

  load(
    document: ProviderDocument,
  ): Promise<void>;

  select(
    selector: string,
  ): ProviderElement[];

  first(
    selector: string,
  ): ProviderElement | undefined;
}
