import { custom } from "viem";
import { useWalletClient } from "wagmi";
import {
  StoryClient,
  StoryConfig,
  type SupportedChainIds,
} from "@story-protocol/core-sdk";
import { storyAeneid } from "@/lib/web3/chains";

export function useStoryClient() {
  const { data: wallet } = useWalletClient();

  const getClient = async () => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }

    const config: StoryConfig = {
      wallet,
      transport: custom(wallet.transport),
      chainId: (storyAeneid.id as SupportedChainIds) ?? "aeneid",
    };

    return StoryClient.newClient(config);
  };

  return { getClient };
}
