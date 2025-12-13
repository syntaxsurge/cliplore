"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyAllPromptsButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied all prompts");
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={() => void copy()}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy all"}
    </Button>
  );
}

