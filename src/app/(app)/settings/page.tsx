"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { z } from "zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fetchConvexUser, upsertConvexUser } from "@/lib/api/convex";
import {
  LICENSE_PRESETS,
  type LicensePreset,
} from "@/lib/story/license-presets";
import { Film, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { OpenAIKeyCard } from "./OpenAIKeyCard";

const LICENSE_PRESET_ORDER: LicensePreset[] = [
  "commercial-5",
  "commercial-10",
  "noncommercial",
];

const LICENSE_PRESET_VALUES = [
  "commercial-5",
  "commercial-10",
  "noncommercial",
] as const satisfies readonly LicensePreset[];

const profileSchema = z.object({
  displayName: z.string().max(32, "Keep it under 32 characters.").optional(),
  defaultLicensePreset: z.enum(LICENSE_PRESET_VALUES),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedValues, setLoadedValues] = useState<ProfileFormValues | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
      defaultLicensePreset: LICENSE_PRESET_ORDER[0],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isValid },
  } = form;

  const selectedPreset =
    useWatch({ control, name: "defaultLicensePreset" }) ?? LICENSE_PRESET_ORDER[0];

  const walletLabel = useMemo(() => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  useEffect(() => {
    if (!address) return;

    startFetching(async () => {
      try {
        setLoadError(null);
        const { user } = await fetchConvexUser(address);
        const userPreset =
          typeof user?.defaultLicensePreset === "string"
            ? user.defaultLicensePreset
            : null;
        const defaultLicensePreset = userPreset && LICENSE_PRESET_VALUES.includes(userPreset as any)
          ? (userPreset as ProfileFormValues["defaultLicensePreset"])
          : LICENSE_PRESET_ORDER[0];
        const nextValues: ProfileFormValues = {
          displayName: user?.displayName ?? "",
          defaultLicensePreset,
        };
        setLoadedValues(nextValues);
        reset(nextValues);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(error);
        setLoadError(message);
      }
    });
  }, [address, reset]);

  const onSubmit = (values: ProfileFormValues) => {
    if (!address) {
      toast.error("Connect a wallet to save your profile.");
      return;
    }

    startSaving(async () => {
      try {
        const normalized: ProfileFormValues = {
          ...values,
          displayName: values.displayName?.trim() || "",
        };

        await upsertConvexUser({
          wallet: address,
          displayName: normalized.displayName || undefined,
          defaultLicensePreset: normalized.defaultLicensePreset,
        });
        setLoadedValues(normalized);
        reset(normalized);
        toast.success("Profile saved.");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to save profile.");
      }
    });
  };

  return (
    <TooltipProvider>
      <main
        id="main"
        className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Account</p>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Settings
              </h1>
              <Badge variant="outline" className="font-mono">
                {walletLabel}
              </Badge>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              Manage your wallet connection, creator defaults, and BYOK AI key for Sora generation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/projects">
                <Film className="h-4 w-4" />
                Studio
              </Link>
            </Button>
          </div>
        </div>

        {loadError ? (
          <Alert variant="warning">
            <AlertTitle>Couldn’t load your profile</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {loadError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    Wallet
                  </CardTitle>
                  <Badge variant={isConnected ? "success" : "warning"}>
                    {isConnected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <CardDescription>
                  Your wallet owns any IP Assets you register on Story Protocol.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Address</div>
                  {address ? (
                    <div className="flex items-start justify-between gap-2">
                      <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
                        {address}
                      </code>
                      <CopyIconButton value={address} label="Copy wallet address" />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Use a dedicated wallet for demos. Keep your OpenAI key private and never
                      paste it into untrusted sites.
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openConnectModal?.()}
                  className="min-w-[160px]"
                >
                  {isConnected ? "Switch wallet" : "Connect wallet"}
                </Button>
              </CardFooter>
            </Card>

            <OpenAIKeyCard />
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader className="space-y-2">
                  <CardTitle className="text-base">Creator profile</CardTitle>
                  <CardDescription>
                    Set a display name and default license preset for new IP assets.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {isFetching ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display name</Label>
                        <Input
                          id="displayName"
                          placeholder="Director Lex"
                          disabled={!isConnected || isFetching || isSaving}
                          {...register("displayName")}
                        />
                        {errors.displayName ? (
                          <p className="text-xs text-destructive">
                            {errors.displayName.message}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Shown on your public asset pages when available.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="defaultLicensePreset">Default license preset</Label>
                        <Controller
                          control={control}
                          name="defaultLicensePreset"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={!isConnected || isFetching || isSaving}
                            >
                              <SelectTrigger id="defaultLicensePreset">
                                <SelectValue placeholder="Select preset" />
                              </SelectTrigger>
                              <SelectContent>
                                {LICENSE_PRESET_ORDER.map((preset) => (
                                  <SelectItem key={preset} value={preset}>
                                    {LICENSE_PRESETS[preset].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.defaultLicensePreset ? (
                          <p className="text-xs text-destructive">
                            {errors.defaultLicensePreset.message}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="outline" className="tabular-nums">
                            {LICENSE_PRESETS[selectedPreset].share ?? 0}% rev share
                          </Badge>
                          <Badge variant="outline" className="tabular-nums">
                            {LICENSE_PRESETS[selectedPreset].fee
                              ? `${LICENSE_PRESETS[selectedPreset].fee} WIP fee`
                              : "No fee"}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Applied automatically when you register new IP Assets.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>

                <CardFooter className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isConnected || isFetching || isSaving || !isDirty}
                    onClick={() => {
                      if (loadedValues) reset(loadedValues);
                      else
                        reset({
                          displayName: "",
                          defaultLicensePreset: LICENSE_PRESET_ORDER[0],
                        });
                    }}
                  >
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    disabled={!isConnected || isFetching || isSaving || !isDirty || !isValid}
                    className="min-w-[160px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
