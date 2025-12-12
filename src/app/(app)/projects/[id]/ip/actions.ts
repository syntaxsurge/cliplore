"use server";

import { z } from "zod";
import { uploadJsonToIPFS } from "@/lib/storage/pinata";
import { keccak256, toHex } from "viem";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});

export async function uploadIpMetadataAction(input: unknown) {
  const parsed = schema.parse(input);

  const ipMetadata = {
    name: parsed.title,
    description: parsed.description,
    attributes: [{ trait_type: "type", value: "video" }],
    animation_url: parsed.videoUrl,
    image: parsed.thumbnailUrl ?? parsed.videoUrl,
  };

  const nftMetadata = {
    name: `${parsed.title} – IP Ownership`,
    description: parsed.description,
    image: parsed.thumbnailUrl ?? parsed.videoUrl,
  };

  const [ipMetadataURI, nftMetadataURI] = await Promise.all([
    uploadJsonToIPFS(ipMetadata),
    uploadJsonToIPFS(nftMetadata),
  ]);

  const ipMetadataHash = keccak256(toHex(JSON.stringify(ipMetadata)));
  const nftMetadataHash = keccak256(toHex(JSON.stringify(nftMetadata)));

  return {
    ipMetadataURI,
    nftMetadataURI,
    ipMetadataHash,
    nftMetadataHash,
  };
}
