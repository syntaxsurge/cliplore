import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export function TruncatedCode(
  props: {
    value: string;
    title?: string;
  } & Omit<ComponentPropsWithoutRef<"code">, "children">,
) {
  const { value, title, className, ...rest } = props;

  return (
    <code
      className={cn(
        "min-w-0 flex-1 truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs",
        className,
      )}
      title={title ?? value}
      {...rest}
    >
      {value}
    </code>
  );
}
