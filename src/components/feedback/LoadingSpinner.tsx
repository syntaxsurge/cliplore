import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
} as const;

export type LoadingSpinnerProps = {
  className?: string;
  label?: string;
  showLabel?: boolean;
  size?: keyof typeof sizeClasses;
};

export function LoadingSpinner({
  className,
  label = "Loading",
  showLabel = false,
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Loader2
        aria-hidden="true"
        className={cn("animate-spin text-primary", sizeClasses[size])}
      />
      {showLabel ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

