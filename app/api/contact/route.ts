import { NextResponse } from "next/server";

const CONTACT_ENDPOINT =
  process.env.CONTACT_ENDPOINT ||
  "https://ads-ai.in/api/contact.php";

const MAX_FIELD_LENGTHS = {
  name: 100,
  email: 150,
  company: 500,
  service: 100,
  message: 3000,
} as const;

function value(
  formData: FormData,
  key: keyof typeof MAX_FIELD_LENGTHS,
): string {
  return String(formData.get(key) || "")
    .trim()
    .slice(0, MAX_FIELD_LENGTHS[key]);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Honeypot field used by the ADS AI contact implementation.
    if (String(formData.get("website") || "").trim()) {
      return NextResponse.json({ success: true });
    }

    const name = value(formData, "name");
    const email = value(formData, "email");
    const company = value(formData, "company");
    const service = value(formData, "service");
    const message = value(formData, "message");

    if (!name || !email || !service || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Required fields are missing.",
        },
        { status: 400 },
      );
    }

    const emailPattern =
      /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email address.",
        },
        { status: 400 },
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.set("name", name);
    upstreamForm.set("email", email);
    upstreamForm.set("company", company);
    upstreamForm.set("service", service);
    upstreamForm.set(
      "message",
      `[Deals ADS Feedback]\\n\\n${message}`,
    );
    upstreamForm.set("website", "");

    const upstream = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      body: upstreamForm,
      cache: "no-store",
    });

    const responseText = await upstream.text();

    if (!upstream.ok) {
      console.error(
        "Contact endpoint failed:",
        upstream.status,
        responseText,
      );

      return NextResponse.json(
        {
          success: false,
          message: "Unable to send feedback.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Feedback route error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
