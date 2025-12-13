import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CreateMultipartUploadCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildB2PublicUrl, getB2Bucket, getB2S3Client } from "@/lib/storage/b2";
import { buildExportObjectKey } from "@/lib/storage/keys";

export const runtime = "nodejs";

const initSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "wallet must be an address"),
  projectId: z.string().min(1),
  exportId: z.string().min(1),
  kind: z.enum(["video", "thumbnail"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const EXPIRES_IN_SECONDS = 60 * 10;
const MIN_MULTIPART_SIZE = 5 * 1024 * 1024;
const MAX_MULTIPART_PARTS = 10_000;
const DEFAULT_PART_SIZE = 10 * 1024 * 1024;
const MB = 1024 * 1024;

function choosePartSizeBytes(sizeBytes: number) {
  const sizeForMaxParts = Math.ceil(sizeBytes / MAX_MULTIPART_PARTS);
  const roundedToMb = Math.ceil(sizeForMaxParts / MB) * MB;
  const partSize = Math.max(DEFAULT_PART_SIZE, roundedToMb, MIN_MULTIPART_SIZE);

  const parts = Math.ceil(sizeBytes / partSize);
  if (parts > MAX_MULTIPART_PARTS) {
    throw new Error(
      `File too large to upload (requires ${parts} parts). Increase part size.`,
    );
  }

  return partSize;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = initSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
      { status: 400 },
    );
  }

  const { wallet, projectId, exportId, kind, fileName, contentType, sizeBytes } =
    parsed.data;

  if (kind === "video" && !contentType.startsWith("video/")) {
    return NextResponse.json(
      { error: "contentType must be video/* for kind=video" },
      { status: 400 },
    );
  }
  if (kind === "thumbnail" && !contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "contentType must be image/* for kind=thumbnail" },
      { status: 400 },
    );
  }

  const key = buildExportObjectKey({
    wallet,
    projectId,
    exportId,
    kind,
    fileName,
  });

  const client = getB2S3Client();
  const bucket = getB2Bucket();
  const publicUrl = buildB2PublicUrl(key);

  try {
    if (sizeBytes < MIN_MULTIPART_SIZE) {
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: EXPIRES_IN_SECONDS },
      );

      return NextResponse.json({
        strategy: "single" as const,
        key,
        publicUrl,
        uploadUrl,
        requiredHeaders: {
          "Content-Type": contentType,
        },
        expiresInSeconds: EXPIRES_IN_SECONDS,
      });
    }

    const partSizeBytes = choosePartSizeBytes(sizeBytes);

    const created = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
    );

    const uploadId = created.UploadId;
    if (!uploadId) {
      throw new Error("Backblaze did not return an uploadId.");
    }

    return NextResponse.json({
      strategy: "multipart" as const,
      key,
      publicUrl,
      uploadId,
      partSizeBytes,
      expiresInSeconds: EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    console.error("storage/presign error", error);
    const message =
      error instanceof Error ? error.message : "Failed to initialize upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
