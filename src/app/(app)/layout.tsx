"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center px-6 py-20">
        <Card className="w-full text-center">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">
              Connect your wallet to continue
            </CardTitle>
            <CardDescription>
              Your dashboard, projects, and creator settings live on your
              wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <ConnectButton showBalance={false} />
            </div>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
