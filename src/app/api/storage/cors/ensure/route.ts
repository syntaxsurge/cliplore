import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureB2BucketCorsForOrigin } from "@/lib/storage/b2";

export const runtime = "nodejs";

const bodySchema = z.object({
  origin: z.string().url().optional(),
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = bodySchema.safeParse(body);
  const origin =
    parsed.success && parsed.data.origin
      ? parsed.data.origin
      : req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const result = await ensureB2BucketCorsForOrigin(origin);
    return NextResponse.json({ ok: true, origin, ...result });
  } catch (error: any) {
    console.error("storage/cors/ensure error", error);
    const name =
      error && typeof error === "object" && "name" in error
        ? String(error.name)
        : "";
    const message = error instanceof Error ? error.message : "Failed to ensure CORS";

    if (name === "AccessDenied") {
      return NextResponse.json(
        {
          error:
            "Backblaze key lacks permission to update bucket CORS. Configure bucket CORS in Backblaze or use an app key with write bucket settings.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

