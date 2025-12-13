"use client";

import { parseEther, zeroAddress } from "viem";
import type { StoryClient } from "@story-protocol/core-sdk";
import { clientEnv } from "@/lib/env/client";

export async function tipIpWithWip(params: {
  client: StoryClient;
  receiverIpId: `0x${string}`;
  amountWip: string;
}) {
  const { client, receiverIpId, amountWip } = params;

  const vault = await client.royalty.getRoyaltyVaultAddress(receiverIpId);
  if (vault === zeroAddress) {
    throw new Error(
      "Royalties aren’t active yet. Mint a license or register a derivative to deploy the IP Royalty Vault.",
    );
  }

  return client.royalty.payRoyaltyOnBehalf({
    receiverIpId,
    payerIpId: zeroAddress,
    token: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
    amount: parseEther(amountWip),
  });
}
