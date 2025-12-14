import { serverEnv } from "@/lib/env/server";
import type { FileObject, PinataMetadata } from "pinata-web3";

type PinResponse = { IpfsHash: string };

let pinataClientPromise: Promise<import("pinata-web3").PinataSDK> | null = null;

async function getPinataClient() {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required to upload metadata to IPFS.");
  }

  pinataClientPromise ??= import("pinata-web3").then(({ PinataSDK }) => {
    return new PinataSDK({ pinataJwt: serverEnv.PINATA_JWT });
  });

  return pinataClientPromise;
}

function fileObjectFromBytes({
  bytes,
  fileName,
  contentType,
}: {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
}): FileObject {
  return new File([bytes], fileName, {
    type: contentType,
    lastModified: Date.now(),
  });
}

export async function uploadJsonToIPFS(
  payload: unknown,
  options?: { cidVersion?: 0 | 1; metadata?: PinataMetadata },
) {
  const pinata = await getPinataClient();

  let response: PinResponse;
  try {
    response = (await pinata.upload.json(payload as object, {
      cidVersion: options?.cidVersion,
      metadata: options?.metadata,
    })) as PinResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Pinata upload failed: ${message}`);
  }

  if (!response?.IpfsHash) {
    throw new Error("Pinata upload failed: missing IpfsHash in response.");
  }

  return `ipfs://${response.IpfsHash}`;
}

export async function uploadFileToIPFS(input: {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
  cidVersion?: 0 | 1;
  metadata?: PinataMetadata;
}) {
  const pinata = await getPinataClient();

  const file = fileObjectFromBytes({
    bytes: input.bytes,
    fileName: input.fileName,
    contentType: input.contentType,
  });

  let response: PinResponse;
  try {
    response = (await pinata.upload.file(file, {
      cidVersion: input.cidVersion,
      metadata: input.metadata,
    })) as PinResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Pinata upload failed: ${message}`);
  }

  if (!response?.IpfsHash) {
    throw new Error("Pinata upload failed: missing IpfsHash in response.");
  }

  return `ipfs://${response.IpfsHash}`;
}
