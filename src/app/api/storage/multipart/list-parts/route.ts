import { NextResponse } from "next/server";
import { z } from "zod";
import { ListPartsCommand, type ListPartsCommandOutput } from "@aws-sdk/client-s3";
import { getB2Bucket, getB2S3Client } from "@/lib/storage/b2";

export const runtime = "nodejs";

const querySchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    key: searchParams.get("key"),
    uploadId: searchParams.get("uploadId"),
  });

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

    const allParts: Array<{
      PartNumber?: number;
      ETag?: string;
      Size?: number;
      LastModified?: Date;
    }> = [];

    let partNumberMarker: string | undefined = undefined;

    while (true) {
      const res: ListPartsCommandOutput = await client.send(
        new ListPartsCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumberMarker: partNumberMarker,
          MaxParts: 1000,
        }),
      );

      if (res.Parts?.length) {
        allParts.push(
          ...res.Parts.map((p) => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag,
            Size: p.Size,
            LastModified: p.LastModified,
          })),
        );
      }

      if (!res.IsTruncated) break;
      if (!res.NextPartNumberMarker) break;
      partNumberMarker = String(res.NextPartNumberMarker);
    }

    return NextResponse.json({
      parts:
        allParts.map((p) => ({
          partNumber: p.PartNumber ?? 0,
          etag: p.ETag ?? "",
          size: p.Size ?? 0,
          lastModified: p.LastModified?.toISOString() ?? null,
        })) ?? [],
    });
  } catch (error) {
    console.error("storage/multipart/list-parts error", error);
    const message =
      error instanceof Error ? error.message : "Failed to list upload parts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
