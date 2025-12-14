import { z } from "zod";
import type { IpMetadata } from "@story-protocol/core-sdk";
import { sha256, toHex, type Address, type Hash } from "viem";
import { datasetMetadataInputSchema } from "@/lib/story/dataset-metadata";

const uriSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("ipfs://") ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    { message: "Must be an ipfs:// or http(s):// URI" },
  );

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
  message: "Must be a 0x-prefixed 20-byte hex address",
});

const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
  message: "Must be a 0x-prefixed 32-byte hex hash",
});

export const uploadIpMetadataSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  creatorAddress: addressSchema,
  creatorName: z.string().min(1).max(32).optional(),
  ipType: z.string().min(1).max(64).optional(),
  tags: z.array(z.string().min(1).max(48)).max(32).optional(),
  mediaUri: uriSchema,
  mediaHash: hashSchema,
  thumbnailUri: uriSchema.optional(),
  imageHash: hashSchema.optional(),
  mediaMimeType: z.string().min(1).optional(),
  mediaSizeBytes: z.number().int().positive().optional(),
  mediaDurationSeconds: z.number().positive().optional(),
  mediaFps: z.number().positive().optional(),
  mediaResolution: z.string().min(1).optional(),
  thumbnailMimeType: z.string().min(1).optional(),
  thumbnailSizeBytes: z.number().int().positive().optional(),
  dataset: datasetMetadataInputSchema.optional(),
});

export type UploadIpMetadataInput = z.infer<typeof uploadIpMetadataSchema>;

export function buildStoryIpMetadata(input: UploadIpMetadataInput) {
  const createdAt = new Date().toISOString();
  const mediaType = input.mediaMimeType?.startsWith("audio/")
    ? "audio"
    : input.mediaMimeType?.startsWith("image/")
      ? "image"
      : input.mediaMimeType?.startsWith("video/")
        ? "video"
        : "other";

  const fallbackName = `${input.creatorAddress.slice(0, 6)}...${input.creatorAddress.slice(-4)}`;
  const creatorName = input.creatorName?.trim() || fallbackName;

  const metadata: IpMetadata = {
    title: input.title,
    description: input.description,
    createdAt,
    image: input.thumbnailUri ?? input.mediaUri,
    imageHash: input.imageHash as Hash | undefined,
    creators: [
      {
        name: creatorName,
        address: input.creatorAddress as Address,
        contributionPercent: 100,
        role: "Creator",
      },
    ],
    mediaUrl: input.mediaUri,
    mediaHash: input.mediaHash as Hash | undefined,
    mediaType,
  };

  if (input.ipType) {
    metadata.ipType = input.ipType;
  }
  if (input.tags?.length) {
    metadata.tags = input.tags;
  }
  if (input.dataset) {
    metadata.dataset = input.dataset;
  }

  const primaryLabel =
    input.ipType === "dataset"
      ? "Dataset sample"
      : mediaType === "audio"
        ? "Audio"
        : mediaType === "image"
          ? "Image"
          : "Video";

  const primaryDetails: Record<string, number | string> = {};
  if (typeof input.mediaSizeBytes === "number") {
    primaryDetails.sizeBytes = input.mediaSizeBytes;
  }
  if (typeof input.mediaDurationSeconds === "number") {
    primaryDetails.durationSeconds = Math.round(input.mediaDurationSeconds * 100) / 100;
  }
  if (typeof input.mediaFps === "number") {
    primaryDetails.fps = input.mediaFps;
  }
  if (typeof input.mediaResolution === "string" && input.mediaResolution) {
    primaryDetails.resolution = input.mediaResolution;
  }
  if (typeof input.mediaMimeType === "string" && input.mediaMimeType) {
    primaryDetails.mimeType = input.mediaMimeType;
  }

  const thumbnailDetails: Record<string, number | string> = {};
  if (typeof input.thumbnailSizeBytes === "number") {
    thumbnailDetails.sizeBytes = input.thumbnailSizeBytes;
  }
  if (typeof input.thumbnailMimeType === "string" && input.thumbnailMimeType) {
    thumbnailDetails.mimeType = input.thumbnailMimeType;
  }

  metadata.media = [
    {
      name: primaryLabel,
      url: input.mediaUri,
      mimeType:
        input.mediaMimeType ??
        (mediaType === "video"
          ? "video/mp4"
          : mediaType === "audio"
            ? "audio/mpeg"
            : "application/octet-stream"),
    },
    ...(input.thumbnailUri
      ? [
          {
            name: "Thumbnail",
            url: input.thumbnailUri,
            mimeType: input.thumbnailMimeType ?? "image/png",
          },
        ]
      : []),
  ];

  if (Object.keys(primaryDetails).length) {
    metadata.mediaDetails = primaryDetails;
  }
  if (Object.keys(thumbnailDetails).length) {
    metadata.thumbnailDetails = thumbnailDetails;
  }

  return metadata;
}

export function buildStoryNftMetadata(input: UploadIpMetadataInput) {
  return {
    name: `${input.title} – IP Ownership`,
    description: input.description,
    image: input.thumbnailUri ?? input.mediaUri,
  };
}

export function sha256Json(payload: unknown): Hash {
  const json = JSON.stringify(payload);
  if (!json) {
    throw new Error("Failed to stringify payload for SHA-256 hashing.");
  }
  return sha256(toHex(json));
}
