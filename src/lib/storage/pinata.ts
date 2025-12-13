import { serverEnv } from "@/lib/env/server";

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

export async function uploadJsonToIPFS(payload: unknown) {
  const pinata = await getPinataClient();

  let response: PinResponse;
  try {
    response = (await pinata.upload.json(payload as object)) as PinResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Pinata upload failed: ${message}`);
  }

  if (!response?.IpfsHash) {
    throw new Error("Pinata upload failed: missing IpfsHash in response.");
  }

  return `ipfs://${response.IpfsHash}`;
}
