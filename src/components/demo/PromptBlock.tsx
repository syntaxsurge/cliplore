"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PromptBlock({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied prompt");
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="absolute right-3 top-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void copy()}
          className="gap-2"
          aria-label="Copy prompt"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <pre className="whitespace-pre-wrap rounded-2xl border border-border bg-muted/25 p-4 pt-12 text-sm leading-relaxed text-foreground/90">
        {text}
      </pre>
    </div>
  );
}

