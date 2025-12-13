"use client";

import { WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";
import type { StoryClient } from "@story-protocol/core-sdk";

export async function getClaimableWipRevenue(params: {
  client: StoryClient;
  ipId: `0x${string}`;
  claimer: `0x${string}`;
}) {
  const { client, ipId, claimer } = params;
  return client.royalty.claimableRevenue({
    ipId,
    claimer,
    token: WIP_TOKEN_ADDRESS,
  });
}

export async function claimAllWipRevenue(params: {
  client: StoryClient;
  ancestorIpId: `0x${string}`;
  claimer: `0x${string}`;
}) {
  const { client, ancestorIpId, claimer } = params;
  return client.royalty.claimAllRevenue({
    ancestorIpId,
    claimer,
    childIpIds: [],
    royaltyPolicies: [],
    currencyTokens: [WIP_TOKEN_ADDRESS],
    claimOptions: {
      autoTransferAllClaimedTokensFromIp: true,
      autoUnwrapIpTokens: true,
    },
  });
}

