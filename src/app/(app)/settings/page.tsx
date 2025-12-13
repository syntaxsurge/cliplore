"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
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
import { fetchConvexUser, upsertConvexUser } from "@/lib/api/convex";
import {
  LICENSE_PRESETS,
  type LicensePreset,
} from "@/lib/story/license-presets";
import { OpenAIKeyCard } from "./OpenAIKeyCard";

const LICENSE_PRESET_ORDER: LicensePreset[] = [
  "commercial-5",
  "commercial-10",
  "noncommercial",
];

const profileSchema = z.object({
  displayName: z.string().max(32, "Keep it under 32 characters.").optional(),
  defaultLicensePreset: z.string().min(1),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      defaultLicensePreset: LICENSE_PRESET_ORDER[0],
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const walletLabel = useMemo(() => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  useEffect(() => {
    if (!address) return;

    startFetching(async () => {
      try {
        const { user } = await fetchConvexUser(address);
        if (user) {
          reset({
            displayName: user.displayName ?? "",
            defaultLicensePreset:
              user.defaultLicensePreset ?? LICENSE_PRESET_ORDER[0],
          });
        }
      } catch (error) {
        console.error(error);
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
        await upsertConvexUser({
          wallet: address,
          displayName: values.displayName,
          defaultLicensePreset: values.defaultLicensePreset,
        });
        toast.success("Profile saved.");
      } catch (error: any) {
        toast.error(error?.message ?? "Failed to save profile.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="text-4xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your wallet connection and creator defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
          <CardDescription>
            Your wallet owns any IP Assets you register on Story Protocol.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-semibold text-foreground">
              {walletLabel}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => openConnectModal?.()}
            className="min-w-[160px]"
          >
            {isConnected ? "Switch wallet" : "Connect wallet"}
          </Button>
        </CardContent>
      </Card>

      <OpenAIKeyCard />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Creator profile</CardTitle>
            <CardDescription>
              Set a display name and default license preset for new IP assets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                placeholder="Director Lex"
                disabled={!isConnected || isFetching || isSaving}
                {...register("displayName")}
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLicensePreset">
                Default license preset
              </Label>
              <select
                id="defaultLicensePreset"
                disabled={!isConnected || isFetching || isSaving}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
                {...register("defaultLicensePreset")}
              >
                {LICENSE_PRESET_ORDER.map((preset) => (
                  <option
                    key={preset}
                    value={preset}
                    className="text-black"
                  >
                    {LICENSE_PRESETS[preset].label}
                  </option>
                ))}
              </select>
              {errors.defaultLicensePreset && (
                <p className="text-xs text-destructive">
                  {errors.defaultLicensePreset.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Applied automatically when you register new IP Assets.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              disabled={!isConnected || isFetching || isSaving}
              className="min-w-[160px]"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
