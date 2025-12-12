"use server";

import { uploadJsonToIPFS } from "@/lib/storage/pinata";
import {
  buildStoryIpMetadata,
  buildStoryNftMetadata,
  keccak256Json,
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
    ipMetadataHash: keccak256Json(ipMetadata),
    nftMetadataHash: keccak256Json(nftMetadata),
  };
}

