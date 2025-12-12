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
});

export type UploadIpMetadataInput = z.infer<typeof uploadIpMetadataSchema>;

export function buildStoryIpMetadata(input: UploadIpMetadataInput) {
  return {
    name: input.title,
    description: input.description,
    attributes: [{ trait_type: "type", value: "video" }],
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

