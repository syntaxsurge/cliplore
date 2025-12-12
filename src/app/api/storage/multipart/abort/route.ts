import { NextResponse } from "next/server";
import { z } from "zod";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getB2Bucket, getB2S3Client } from "@/lib/storage/b2";

export const runtime = "nodejs";

const abortSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = abortSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const client = getB2S3Client();
    const bucket = getB2Bucket();
    const { key, uploadId } = parsed.data;

    await client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("storage/multipart/abort error", error);
    const message =
      error instanceof Error ? error.message : "Failed to abort upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

