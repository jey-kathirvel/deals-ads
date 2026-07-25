export interface ImageQualityInput {
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ImageQualityIssue {
  code: string;
  message: string;
}

export interface ImageQualityResult {
  valid: boolean;
  score: number;
  issues: ImageQualityIssue[];
}

export class ImageQualityValidator {

  validate(
    image: ImageQualityInput,
  ): ImageQualityResult {

    const issues: ImageQualityIssue[] = [];

    let score = 100;

    if (!image.imageUrl?.trim()) {
      issues.push({
        code: "missing_url",
        message: "Image URL is missing",
      });
      score = 0;
    } else {
      try {
        const url = new URL(image.imageUrl);

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          issues.push({
            code: "invalid_protocol",
            message: "Image URL must use HTTP/HTTPS",
          });

          score -= 40;
        }

      } catch {
        issues.push({
          code: "invalid_url",
          message: "Invalid image URL",
        });

        score = 0;
      }
    }

    if (
      image.width != null &&
      image.height != null
    ) {

      if (
        image.width < 300 ||
        image.height < 300
      ) {
        issues.push({
          code: "low_resolution",
          message:
            "Image resolution is too low",
        });

        score -= 25;
      }

      const ratio =
        image.width / image.height;

      if (
        ratio < 0.4 ||
        ratio > 2.5
      ) {
        issues.push({
          code: "odd_aspect_ratio",
          message:
            "Unusual aspect ratio",
        });

        score -= 10;
      }
    }

    if (image.mimeType) {

      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ];

      if (
        !allowed.includes(
          image.mimeType.toLowerCase(),
        )
      ) {
        issues.push({
          code: "unsupported_format",
          message:
            "Unsupported image format",
        });

        score -= 20;
      }
    }

    if (
      image.sizeBytes != null &&
      image.sizeBytes > 5 * 1024 * 1024
    ) {
      issues.push({
        code: "large_file",
        message:
          "Image file exceeds 5 MB",
      });

      score -= 15;
    }

    score = Math.max(
      0,
      Math.min(
        100,
        Math.round(score),
      ),
    );

    return {
      valid:
        score >= 70,
      score,
      issues,
    };
  }
}
