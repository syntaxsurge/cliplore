"use server";

import { uploadJsonToIPFS } from "@/lib/storage/pinata";
import {
  buildStoryIpMetadata,
  buildStoryNftMetadata,
  sha256Json,
  uploadIpMetadataSchema,
  type UploadIpMetadataInput,
} from "@/lib/story/ip-metadata";

export async function uploadIpMetadataAction(input: unknown) {
  const parsed = uploadIpMetadataSchema.parse(input) as UploadIpMetadataInput;

  const ipMetadata = buildStoryIpMetadata(parsed);
  const nftMetadata = buildStoryNftMetadata(parsed);

  const [ipMetadataUri, nftMetadataUri] = await Promise.all([
    uploadJsonToIPFS(ipMetadata),
    uploadJsonToIPFS(nftMetadata),
  ]);

  return {
    ipMetadataUri,
    nftMetadataUri,
    ipMetadataHash: sha256Json(ipMetadata),
    nftMetadataHash: sha256Json(nftMetadata),
  };
}
