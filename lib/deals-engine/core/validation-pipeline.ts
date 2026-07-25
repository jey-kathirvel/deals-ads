import type {
  DealValidationResult,
  DealValidator,
  RawDeal,
} from "../contracts";

export interface ValidationPipelineResult {
  validDeals: RawDeal[];
  rejectedDeals: RawDeal[];
  totalValidated: number;
}

export class ValidationPipeline {
  constructor(
    private readonly validators: DealValidator[],
  ) {}

  async validate(
    deals: RawDeal[],
  ): Promise<ValidationPipelineResult> {

    const validDeals: RawDeal[] = [];
    const rejectedDeals: RawDeal[] = [];

    for (const deal of deals) {

      let valid = true;

      for (const validator of this.validators) {

        const result: DealValidationResult =
          await validator.validate(deal);

        if (!result.valid) {
          valid = false;
          break;
        }
      }

      if (valid) {
        validDeals.push(deal);
      } else {
        rejectedDeals.push(deal);
      }
    }

    return {
      validDeals,
      rejectedDeals,
      totalValidated: deals.length,
    };
  }
}
