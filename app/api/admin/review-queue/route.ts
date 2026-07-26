import { requireAdminSession } from "@/lib/auth/guard";
import { NextResponse } from "next/server";
import {
  addToQueue,
  listQueue,
  updateStatus,
} from "@/lib/review/store";

type ReviewActionBody = {
  id?: unknown;
  action?: unknown;
  remarks?: unknown;
  source?: unknown;
  productName?: unknown;
  category?: unknown;
  dealPrice?: unknown;
  originalPrice?: unknown;
  discount?: unknown;
  coupon?: unknown;
  dealUrl?: unknown;
  imageUrl?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status: 400,
    },
  );
}

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json(listQueue());
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  let body: ReviewActionBody;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON request body.");
  }

  if (body.action === "approve" || body.action === "reject") {
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return badRequest("Review item ID is required.");
    }

    const remarks =
      typeof body.remarks === "string" ? body.remarks.trim() : "";

    if (body.action === "reject" && !remarks) {
      return badRequest("Rejection remarks are required.");
    }

    const result = updateStatus(
      id,
      body.action === "approve" ? "APPROVED" : "REJECTED",
      "admin",
      remarks,
    );

    if (!result.ok) {

      if (result.reason === "NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            message: "Review item was not found.",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "This review item has already been processed.",
          item: result.item,
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(result.item);
  }

  const reviewItem = {
    source: typeof body.source === "string" ? body.source : undefined,
    productName:
      typeof body.productName === "string" ? body.productName : undefined,
    category:
      typeof body.category === "string" ? body.category : undefined,
    dealPrice:
      typeof body.dealPrice === "number" ||
      typeof body.dealPrice === "string"
        ? Number(body.dealPrice)
        : undefined,
    originalPrice:
      typeof body.originalPrice === "number" ||
      typeof body.originalPrice === "string"
        ? Number(body.originalPrice)
        : undefined,
    discount:
      typeof body.discount === "number" ||
      typeof body.discount === "string"
        ? Number(body.discount)
        : undefined,
    coupon: typeof body.coupon === "string" ? body.coupon : undefined,
    dealUrl: typeof body.dealUrl === "string" ? body.dealUrl : undefined,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
  };

  return NextResponse.json(addToQueue(reviewItem), {
    status: 201,
  });
}
