"use client";

// Polyfill indexedDB for SSR builds so wallet connectors don't crash during prerender.
if (typeof window === "undefined") {
  // @ts-expect-error - module types are not exported correctly but runtime polyfill is fine
  import("fake-indexeddb/auto");
}

import "@rainbow-me/rainbowkit/styles.css";
import { Provider } from "react-redux";
import { store } from "./store";
import { ThemeProvider } from "next-themes";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, queryClient } from "@/lib/web3/wagmi-config";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => undefined);
      })
      .catch((err) => console.error("SW registration failed", err));
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </Provider>
  );
}
