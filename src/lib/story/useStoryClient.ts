"use client";

import { useMemo } from "react";
import { custom } from "viem";
import { useWalletClient } from "wagmi";
import {
  StoryClient,
  type StoryConfig,
  type SupportedChainIds,
} from "@story-protocol/core-sdk";
import { storyAeneid } from "@/lib/web3/chains";

export function useStoryClient() {
  const { data: wallet } = useWalletClient();

  return useMemo(() => {
    if (!wallet) return null;
    const config: StoryConfig = {
      wallet,
      transport: custom(wallet.transport),
      chainId: (storyAeneid.id as SupportedChainIds) ?? "aeneid",
    };

    return StoryClient.newClient(config);
  }, [wallet]);
}
