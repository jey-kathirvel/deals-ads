import assert from "node:assert/strict";

import {
  ImageQualityValidator,
} from "../../lib/deals-engine/quality/image-quality-validator";

const validator =
  new ImageQualityValidator();

const good =
  validator.validate({

    imageUrl:
      "https://example.com/image.jpg",

    width: 1200,
    height: 800,

    mimeType:
      "image/jpeg",

    sizeBytes:
      500000,

  });

assert.equal(
  good.valid,
  true,
);

assert.equal(
  good.score,
  100,
);

const bad =
  validator.validate({

    imageUrl:
      "ftp://example.com/file.bmp",

    width: 120,
    height: 100,

    mimeType:
      "image/bmp",

    sizeBytes:
      10 * 1024 * 1024,

  });

assert.equal(
  bad.valid,
  false,
);

assert.ok(
  bad.score < 70,
);

assert.ok(
  bad.issues.length >= 3,
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      goodScore:
        good.score,
      badScore:
        bad.score,
    },
    null,
    2,
  ),
);
