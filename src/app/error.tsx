"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  const handleRetry = () => {
    startTransition(() => {
      reset();
      router.refresh();
    });
  };

  console.error(error);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full text-center">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl sm:text-3xl">
            Something went wrong
          </CardTitle>
          <CardDescription>
            Try again or refresh the page. If the issue continues, check your
            network and wallet connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleRetry}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
