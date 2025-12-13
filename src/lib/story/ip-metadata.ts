import { z } from "zod";
import type { IpMetadata } from "@story-protocol/core-sdk";
import { sha256, toHex, type Address, type Hash } from "viem";

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
  videoUri: uriSchema,
  mediaHash: hashSchema.optional(),
  thumbnailUri: uriSchema.optional(),
  imageHash: hashSchema.optional(),
  videoMimeType: z.string().min(1).optional(),
  videoSizeBytes: z.number().int().positive().optional(),
  videoDurationSeconds: z.number().positive().optional(),
  videoFps: z.number().positive().optional(),
  videoResolution: z.string().min(1).optional(),
  thumbnailMimeType: z.string().min(1).optional(),
  thumbnailSizeBytes: z.number().int().positive().optional(),
});

export type UploadIpMetadataInput = z.infer<typeof uploadIpMetadataSchema>;

export function buildStoryIpMetadata(input: UploadIpMetadataInput) {
  const createdAt = new Date().toISOString();
  const mediaType = input.videoMimeType?.startsWith("audio/")
    ? "audio"
    : input.videoMimeType?.startsWith("image/")
      ? "image"
      : "video";

  const fallbackName = `${input.creatorAddress.slice(0, 6)}...${input.creatorAddress.slice(-4)}`;
  const creatorName = input.creatorName?.trim() || fallbackName;

  const metadata: IpMetadata = {
    title: input.title,
    description: input.description,
    createdAt,
    image: input.thumbnailUri ?? input.videoUri,
    imageHash: input.imageHash as Hash | undefined,
    creators: [
      {
        name: creatorName,
        address: input.creatorAddress as Address,
        contributionPercent: 100,
        role: "Creator",
      },
    ],
    mediaUrl: input.videoUri,
    mediaHash: input.mediaHash as Hash | undefined,
    mediaType,
    media: [
      {
        name: "Video",
        url: input.videoUri,
        mimeType: input.videoMimeType ?? "video/mp4",
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
    ],
  };

  const videoDetails: Record<string, number | string> = {};
  if (typeof input.videoSizeBytes === "number") {
    videoDetails.sizeBytes = input.videoSizeBytes;
  }
  if (typeof input.videoDurationSeconds === "number") {
    videoDetails.durationSeconds = Math.round(input.videoDurationSeconds * 100) / 100;
  }
  if (typeof input.videoFps === "number") {
    videoDetails.fps = input.videoFps;
  }
  if (typeof input.videoResolution === "string" && input.videoResolution) {
    videoDetails.resolution = input.videoResolution;
  }
  if (typeof input.videoMimeType === "string" && input.videoMimeType) {
    videoDetails.mimeType = input.videoMimeType;
  }

  const thumbnailDetails: Record<string, number | string> = {};
  if (typeof input.thumbnailSizeBytes === "number") {
    thumbnailDetails.sizeBytes = input.thumbnailSizeBytes;
  }
  if (typeof input.thumbnailMimeType === "string" && input.thumbnailMimeType) {
    thumbnailDetails.mimeType = input.thumbnailMimeType;
  }

  if (Object.keys(videoDetails).length) {
    metadata.video = videoDetails;
  }
  if (Object.keys(thumbnailDetails).length) {
    metadata.thumbnail = thumbnailDetails;
  }

  return metadata;
}

export function buildStoryNftMetadata(input: UploadIpMetadataInput) {
  return {
    name: `${input.title} – IP Ownership`,
    description: input.description,
    image: input.thumbnailUri ?? input.videoUri,
  };
}

export function sha256Json(payload: unknown): Hash {
  const json = JSON.stringify(payload);
  if (!json) {
    throw new Error("Failed to stringify payload for SHA-256 hashing.");
  }
  return sha256(toHex(json));
}
