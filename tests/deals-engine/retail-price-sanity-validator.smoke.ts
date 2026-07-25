import assert from "node:assert/strict";

import {
  RetailPriceSanityValidator,
} from "../../lib/deals-engine/quality/retail-price-sanity-validator";

const validator =
  new RetailPriceSanityValidator({
    maximumAllowedDiscountPercentage: 95,
    suspiciousDiscountPercentage: 80,
    discountTolerancePercentagePoints: 2,
    minimumPrice: 0.01,
    maximumPrice: 100_000_000,
    supportedCurrencies: [
      "INR",
      "USD",
    ],
  });

const healthy =
  validator.validate({
    currentPrice: 799,
    originalPrice: 999,
    discountPercentage: 20,
    currency: "INR",
  });

assert.equal(
  healthy.valid,
  true,
);

assert.equal(
  healthy.score,
  100,
);

assert.equal(
  healthy.calculatedDiscountPercentage,
  20.02,
);

assert.equal(
  healthy.issues.length,
  0,
);

const mismatch =
  validator.validate({
    currentPrice: 500,
    originalPrice: 1000,
    discountPercentage: 20,
    currency: "INR",
  });

assert.equal(
  mismatch.valid,
  false,
);

assert.ok(
  mismatch.issues.some(
    issue =>
      issue.code ===
      "discount_mismatch",
  ),
);

const inverted =
  validator.validate({
    currentPrice: 1200,
    originalPrice: 1000,
    discountPercentage: 10,
    currency: "INR",
  });

assert.equal(
  inverted.valid,
  false,
);

assert.ok(
  inverted.issues.some(
    issue =>
      issue.code ===
      "price_inversion",
  ),
);

const suspicious =
  validator.validate({
    currentPrice: 100,
    originalPrice: 1000,
    discountPercentage: 90,
    currency: "INR",
  });

assert.equal(
  suspicious.valid,
  false,
);

assert.ok(
  suspicious.issues.some(
    issue =>
      issue.code ===
      "suspicious_discount",
  ),
);

const invalid =
  validator.validate({
    currentPrice: 0,
    originalPrice: -100,
    discountPercentage: 110,
    currency: "RUPEES",
  });

assert.equal(
  invalid.valid,
  false,
);

assert.equal(
  invalid.score,
  0,
);

assert.ok(
  invalid.issues.length >= 4,
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      healthyScore:
        healthy.score,
      mismatchScore:
        mismatch.score,
      invertedScore:
        inverted.score,
      suspiciousScore:
        suspicious.score,
      invalidScore:
        invalid.score,
    },
    null,
    2,
  ),
);
