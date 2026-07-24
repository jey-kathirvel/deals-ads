export * from "./core/discovery-engine";
export * from "./core/validator";
export * from "./core/deduplicator";

export * from "./models/deal";
export * from "./models/coupon";

export * from "./providers/provider";

export * from "./utils/score";
export * from "./utils/url";

export * from "./categories/default-categories";

export * from "./core/lifecycle";

// STEP-001A domain exports
export { Category } from "./models/category";
export { Retailer } from "./models/retailer";

export type { Deal } from "./models/deal";
export type { Price } from "./models/price";
export type { ProviderInfo } from "./models/provider";
export type { PublishResult } from "./models/publish-result";
export type { DiscoveryRun } from "./models/discovery-run";

export type {
  DiscoveryResult as DomainDiscoveryResult,
} from "./models/discovery-result";

export type {
  ValidationResult as DomainValidationResult,
} from "./models/validation";

// STEP-001B provider contract exports.
// Aliases prevent collisions with the existing discovery implementation.
export type {
  RawDeal,
  DiscoveryContext,
  ProviderDiscoveryResult,
  DiscoveryProvider as DiscoveryProviderContract,
} from "./contracts/discovery-provider";

export type {
  ProviderRegistry,
} from "./contracts/provider-registry";

export { InMemoryProviderRegistry } from "./core/provider-registry";

export { DiscoveryManager } from "./core/discovery-manager";

export { DiscoveryAggregator } from "./core/discovery-aggregator";

export type {
  DiscoveryAggregate,
} from "./contracts/discovery-aggregate";

export { ValidationPipeline } from "./core/validation-pipeline";

export type {
  DealValidator,
  DealValidationResult,
  ValidationError,
} from "./contracts/deal-validator";

export * from "./validators";

export * from "./core/duplicate-detector";

export * from "./core/quality-scorer";

export * from "./core/publish-filter";

export * from "./core/deal-processing-pipeline";
export type {
  DealProcessingResult,
} from "./contracts/deal-processing-result";

export * from "./core/discovery-engine";

export type {
  DiscoveryEngineResult,
} from "./contracts/discovery-engine-result";

export * from "./core/fetch-provider-http-client";

export type {
  ProviderHttpClient,
  ProviderHttpRequest,
  ProviderHttpResponse,
} from "./contracts/provider-http-client";

export {
  ProviderHttpError,
} from "./contracts/provider-http-client";

export * from "./core/provider-document-loader";

export type {
  ProviderDocument,
} from "./contracts/provider-document";

export * from "./core/cheerio-html-parser";

export type {
  ProviderHtmlParser,
  ProviderElement,
} from "./contracts/provider-html-parser";

export * from "./core/provider-extractor";

export type {
  ProviderExtractor,
  ProviderExtractorFactory,
} from "./contracts/provider-extractor";

export * from "./core/provider-normalizer";

export type {
  ProviderNormalizer,
} from "./contracts/provider-normalizer";

export * from "./providers";

export * from "./providers/selectors";

export type {
  ProviderSelectorProfile,
} from "./contracts/provider-selector-profile";

export * from "./providers/amazon-discovery-provider";

export * from "./core/amazon-deal-mapper";

export type {
  ProviderDealMapper,
} from "./contracts/provider-deal-mapper";

export * from "./providers/selectors/flipkart-selector-profile";

export * from "./core/flipkart-deal-mapper";

export * from "./providers/flipkart-discovery-provider";

export * from "./core/discovery-scheduler";
