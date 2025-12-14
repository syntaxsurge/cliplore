"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpRight } from "lucide-react";

export function ExternalLinkIconButton(props: { href: string; label: string }) {
  const { href, label } = props;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
          >
            <ArrowUpRight />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
