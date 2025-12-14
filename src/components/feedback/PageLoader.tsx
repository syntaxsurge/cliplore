import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export type PageLoaderProps = {
  className?: string;
  title?: string;
  description?: string;
};

export function PageLoader({
  className,
  title = "Loading",
  description,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-3xl flex-1 items-center px-4 py-20 sm:px-6 lg:px-8",
        className,
      )}
    >
      <Card className="w-full text-center">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <LoadingSpinner size="lg" label={title} />
        </CardContent>
      </Card>
    </div>
  );
}

