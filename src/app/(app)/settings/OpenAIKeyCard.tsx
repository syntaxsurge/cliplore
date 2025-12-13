"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function safeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

export function OpenAIKeyCard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const focus = searchParams.get("focus");
  const next = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (focus !== "openai") return;
    const el = document.getElementById("openai-byok-card");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/openai-key", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { hasKey?: boolean } | null;
      setHasKey(Boolean(data?.hasKey));
    })();
  }, []);

  const statusLabel = useMemo(() => {
    if (hasKey === null) return "Checking…";
    return hasKey ? "Key saved on this device." : "No key saved yet.";
  }, [hasKey]);

  const saveKey = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Enter your OpenAI API key.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/settings/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save key.");
        return;
      }

      setApiKey("");
      setHasKey(true);
      toast.success("OpenAI key saved.");

      if (next) {
        router.push(next);
      }
    });
  };

  const clearKey = () => {
    startTransition(async () => {
      const res = await fetch("/api/settings/openai-key", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to clear key.");
        return;
      }
      setHasKey(false);
      toast.success("OpenAI key cleared.");
    });
  };

  return (
    <Card id="openai-byok-card">
      <CardHeader>
        <CardTitle>AI (Bring your own OpenAI key)</CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable Sora generation. It’s stored on this
          device as an encrypted, HTTP-only cookie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{statusLabel}</div>

        <div className="space-y-2">
          <Label htmlFor="openaiApiKey">OpenAI API key</Label>
          <div className="flex gap-2">
            <Input
              id="openaiApiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShow((current) => !current)}
              disabled={isPending}
              aria-label={show ? "Hide API key" : "Show API key"}
              className="shrink-0"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use a Project API key from your OpenAI dashboard and keep it private.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={saveKey}
          disabled={isPending || apiKey.trim().length === 0}
          className="min-w-[140px]"
        >
          {isPending ? "Saving…" : "Save key"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={clearKey}
          disabled={isPending || !hasKey}
          className="min-w-[140px]"
        >
          Clear key
        </Button>
      </CardFooter>
    </Card>
  );
}

