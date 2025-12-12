import { NextResponse } from "next/server";
import { z } from "zod";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { buildB2PublicUrl, getB2Bucket, getB2S3Client } from "@/lib/storage/b2";

export const runtime = "nodejs";

const completeSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(10_000),
        etag: z.string().min(1),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const client = getB2S3Client();
    const bucket = getB2Bucket();
    const { key, uploadId, parts } = parsed.data;

    const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);

    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sorted.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );

    return NextResponse.json({
      key,
      publicUrl: buildB2PublicUrl(key),
    });
  } catch (error) {
    console.error("storage/multipart/complete error", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete multipart upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

