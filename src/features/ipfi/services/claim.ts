"use client";

import type { StoryClient } from "@story-protocol/core-sdk";
import { zeroAddress } from "viem";
import { clientEnv } from "@/lib/env/client";

async function ensureRoyaltyVaultDeployed(client: StoryClient, ipId: `0x${string}`) {
  const vault = await client.royalty.getRoyaltyVaultAddress(ipId);
  if (vault === zeroAddress) {
    throw new Error(
      "Royalties aren’t active yet. Mint a license or register a derivative to deploy the IP Royalty Vault.",
    );
  }
  return vault;
}

export async function getClaimableWipRevenue(params: {
  client: StoryClient;
  ipId: `0x${string}`;
  claimer: `0x${string}`;
}) {
  const { client, ipId, claimer } = params;
  await ensureRoyaltyVaultDeployed(client, ipId);
  return client.royalty.claimableRevenue({
    ipId,
    claimer,
    token: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
  });
}

export async function claimAllWipRevenue(params: {
  client: StoryClient;
  ancestorIpId: `0x${string}`;
  claimer: `0x${string}`;
}) {
  const { client, ancestorIpId, claimer } = params;
  await ensureRoyaltyVaultDeployed(client, ancestorIpId);
  return client.royalty.claimAllRevenue({
    ancestorIpId,
    claimer,
    childIpIds: [],
    royaltyPolicies: [],
    currencyTokens: [clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`],
    claimOptions: {
      autoTransferAllClaimedTokensFromIp: true,
      autoUnwrapIpTokens: true,
    },
  });
}
