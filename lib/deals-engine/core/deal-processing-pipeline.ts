import type {
  DealProcessingResult,
  DealValidator,
  RawDeal,
} from "../contracts";

import { DuplicateDetector } from "./duplicate-detector";
import { PublishFilter } from "./publish-filter";
import { ValidationPipeline } from "./validation-pipeline";

export class DealProcessingPipeline {
  private readonly validationPipeline: ValidationPipeline;

  constructor(
    validators: DealValidator[],
    private readonly duplicateDetector = new DuplicateDetector(),
    private readonly publishFilter = new PublishFilter(),
  ) {
    this.validationPipeline = new ValidationPipeline(validators);
  }

  async process(
    deals: RawDeal[],
  ): Promise<DealProcessingResult> {

    const startedAt = Date.now();

    const validationResult =
      await this.validationPipeline.validate(deals);

    const duplicateResult =
      this.duplicateDetector.removeDuplicates(
        validationResult.validDeals,
      );

    const publishResult =
      this.publishFilter.filter(
        duplicateResult.uniqueDeals,
      );

    return {
      discoveredDeals: deals.length,
      validatedDeals: validationResult.validDeals.length,
      validationRejectedDeals:
        validationResult.rejectedDeals.length,
      duplicateDeals:
        duplicateResult.duplicateDeals.length,
      qualityRejectedDeals:
        publishResult.rejectedDeals.length,
      publishableDeals:
        publishResult.publishableDeals,
      durationMs: Date.now() - startedAt,
    };
  }
}
