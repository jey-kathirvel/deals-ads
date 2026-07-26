import fs from "fs";
import path from "path";
import crypto from "crypto";
import { addAudit } from "@/lib/audit/store";

const FILE = path.join(process.cwd(), "data/review-queue.json");

export interface ReviewItem {
  id: string;
  source: string;
  productName: string;
  category: string;
  dealPrice: number;
  originalPrice: number;
  discount: number;
  coupon: string;
  dealUrl: string;
  imageUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewer?: string;
  reviewedAt?: string;
  remarks?: string;
  createdAt: string;
}

export type ReviewStatusUpdateResult =
  | {
      ok: true;
      item: ReviewItem;
    }
  | {
      ok: false;
      reason: "NOT_FOUND";
      item: null;
    }
  | {
      ok: false;
      reason: "ALREADY_PROCESSED";
      item: ReviewItem;
    };

function ensureDirectory() {
  fs.mkdirSync(path.dirname(FILE), {
    recursive: true,
  });
}

function read(): ReviewItem[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(data: ReviewItem[]) {
  ensureDirectory();

  const temporaryFile = `${FILE}.tmp`;

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(data, null, 2),
    "utf8",
  );

  fs.renameSync(temporaryFile, FILE);
}

export function listQueue() {
  return read();
}

export function addToQueue(item: Partial<ReviewItem>) {
  const rows = read();

  const review: ReviewItem = {
    id: crypto.randomUUID(),
    source: item.source?.trim() || "manual",
    productName: item.productName?.trim() || "",
    category: item.category?.trim() || "General",
    dealPrice: Number(item.dealPrice ?? 0),
    originalPrice: Number(item.originalPrice ?? 0),
    discount: Number(item.discount ?? 0),
    coupon: item.coupon?.trim() || "",
    dealUrl: item.dealUrl?.trim() || "",
    imageUrl: item.imageUrl?.trim() || "",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  rows.unshift(review);
  write(rows);

  addAudit("Review Queue", "ADD", "SUCCESS", {
    id: review.id,
  });

  return review;
}

export function updateStatus(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewer = "admin",
  remarks = "",
): ReviewStatusUpdateResult {
  const rows = read();
  const index = rows.findIndex(item => item.id === id);

  if (index < 0) {
    addAudit("Review Queue", status, "FAILED", {
      id,
      reason: "NOT_FOUND",
    });

    return {
      ok: false,
      reason: "NOT_FOUND",
      item: null,
    };
  }

  const current = rows[index];

  if (current.status !== "PENDING") {
    addAudit("Review Queue", status, "FAILED", {
      id,
      reason: "ALREADY_PROCESSED",
      currentStatus: current.status,
    });

    return {
      ok: false,
      reason: "ALREADY_PROCESSED",
      item: current,
    };
  }

  const updated: ReviewItem = {
    ...current,
    status,
    reviewer,
    reviewedAt: new Date().toISOString(),
    remarks,
  };

  rows[index] = updated;
  write(rows);

  addAudit("Review Queue", status, "SUCCESS", {
    id,
  });

  return {
    ok: true,
    item: updated,
  };
}
