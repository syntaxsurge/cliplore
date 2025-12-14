"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  ipId: string;
  licensorWallet: string | null | undefined;
  className?: string;
};

export function OwnerDashboardCallout({
  ipId,
  licensorWallet,
  className,
}: Props) {
  const { address, isConnected } = useAccount();

  const shouldShow = useMemo(() => {
    if (!isConnected || !address || !licensorWallet) return false;
    return address.toLowerCase() === licensorWallet.toLowerCase();
  }, [address, isConnected, licensorWallet]);

  if (!shouldShow) return null;

  return (
    <Alert
      variant="info"
      role="status"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <AlertTitle>Creator view</AlertTitle>
        <AlertDescription>
          You’re connected as the creator wallet for this IP asset. Only you can
          see this shortcut.
        </AlertDescription>
      </div>
      <Button asChild size="sm" className="w-full shrink-0 sm:w-auto">
        <Link href={`/assets/${encodeURIComponent(ipId)}`}>
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Open asset dashboard
        </Link>
      </Button>
    </Alert>
  );
}

