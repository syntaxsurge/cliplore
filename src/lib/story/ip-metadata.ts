import { z } from "zod";
import { keccak256, toHex } from "viem";
import { stableJsonStringify } from "@/lib/utils";

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

export const uploadIpMetadataSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  videoUri: uriSchema,
  thumbnailUri: uriSchema.optional(),
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
  const attributes: Array<{ trait_type: string; value: string | number }> = [
    { trait_type: "type", value: "video" },
  ];

  if (input.videoMimeType) {
    attributes.push({ trait_type: "video_mime_type", value: input.videoMimeType });
  }
  if (input.videoSizeBytes) {
    attributes.push({ trait_type: "video_size_bytes", value: input.videoSizeBytes });
  }
  if (input.videoDurationSeconds) {
    attributes.push({
      trait_type: "video_duration_seconds",
      value: Math.round(input.videoDurationSeconds * 100) / 100,
    });
  }
  if (input.videoFps) {
    attributes.push({ trait_type: "video_fps", value: input.videoFps });
  }
  if (input.videoResolution) {
    attributes.push({ trait_type: "video_resolution", value: input.videoResolution });
  }
  if (input.thumbnailMimeType) {
    attributes.push({
      trait_type: "thumbnail_mime_type",
      value: input.thumbnailMimeType,
    });
  }
  if (input.thumbnailSizeBytes) {
    attributes.push({
      trait_type: "thumbnail_size_bytes",
      value: input.thumbnailSizeBytes,
    });
  }

  return {
    name: input.title,
    description: input.description,
    attributes,
    animation_url: input.videoUri,
    image: input.thumbnailUri ?? input.videoUri,
  };
}

export function buildStoryNftMetadata(input: UploadIpMetadataInput) {
  return {
    name: `${input.title} – IP Ownership`,
    description: input.description,
    image: input.thumbnailUri ?? input.videoUri,
  };
}

export function keccak256Json(payload: unknown) {
  return keccak256(toHex(stableJsonStringify(payload)));
}
