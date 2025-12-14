"use client";

import NextTopLoader from "nextjs-toploader";

export function RouteTopLoader() {
  return (
    <NextTopLoader
      color="hsl(var(--primary))"
      height={3}
      showSpinner={false}
      shadow="0 0 10px hsl(var(--primary) / 0.35), 0 0 5px hsl(var(--primary) / 0.2)"
      zIndex={60}
    />
  );
}

