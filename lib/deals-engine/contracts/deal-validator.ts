import type { RawDeal } from "./discovery-provider";

export interface ValidationError {
  code: string;
  message: string;
}

export interface DealValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface DealValidator {
  readonly name: string;

  validate(
    deal: RawDeal,
  ): Promise<DealValidationResult>;
}
