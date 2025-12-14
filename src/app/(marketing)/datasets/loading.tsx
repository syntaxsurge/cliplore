import { Skeleton } from "@/components/ui/skeleton";

function LoadingCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <Skeleton className="h-[72px] w-full" />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </div>
  );
}

