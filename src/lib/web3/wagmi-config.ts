import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient } from "@tanstack/react-query";
import { createConfig, createStorage } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { http } from "viem";
import { storyAeneid } from "./chains";
import { clientEnv } from "../env/client";

const memoryStore: Record<string, string> = {};
const memoryStorage = {
  getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
  setItem: (key: string, value: string) => {
    memoryStore[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
};

const walletConnectProjectId = clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const enableWalletConnect =
  !!walletConnectProjectId &&
  walletConnectProjectId !== "demo-walletconnect-project";

export const wagmiConfig = enableWalletConnect
  ? getDefaultConfig({
      appName: "Cliplore",
      projectId: walletConnectProjectId,
      chains: [storyAeneid],
      ssr: true,
      storage: createStorage({
        storage: memoryStorage,
      }),
    })
  : createConfig({
      chains: [storyAeneid],
      ssr: true,
      connectors: [injected(), coinbaseWallet({ appName: "Cliplore" })],
      transports: {
        [storyAeneid.id]: http(clientEnv.NEXT_PUBLIC_STORY_RPC_URL),
      },
      storage: createStorage({
        storage: memoryStorage,
      }),
    });

export const queryClient = new QueryClient();
