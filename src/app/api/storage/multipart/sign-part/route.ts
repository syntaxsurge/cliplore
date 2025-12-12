import { NextResponse } from "next/server";
import { z } from "zod";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getB2Bucket, getB2S3Client } from "@/lib/storage/b2";

export const runtime = "nodejs";

const EXPIRES_IN_SECONDS = 60 * 10;

const signSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  partNumber: z.number().int().min(1).max(10_000),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const client = getB2S3Client();
    const bucket = getB2Bucket();
    const { key, uploadId, partNumber } = parsed.data;

    const uploadUrl = await getSignedUrl(
      client,
      new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: EXPIRES_IN_SECONDS },
    );

    return NextResponse.json({
      uploadUrl,
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    console.error("storage/multipart/sign-part error", error);
    const message =
      error instanceof Error ? error.message : "Failed to sign upload part";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

