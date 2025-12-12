export type LicensePreset = "commercial-5" | "commercial-10" | "noncommercial";

export const LICENSE_PRESETS: Record<
  LicensePreset,
  { label: string; share?: number; fee?: string }
> = {
  "commercial-5": {
    label: "Commercial remix · 5% rev share · 1 WIP fee",
    share: 5,
    fee: "1",
  },
  "commercial-10": {
    label: "Commercial remix · 10% rev share · 1 WIP fee",
    share: 10,
    fee: "1",
  },
  noncommercial: { label: "Non-commercial remix", share: 0 },
};

