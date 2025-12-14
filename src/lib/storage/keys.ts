const SAFE_KEY_CHARS = /[^a-zA-Z0-9._-]+/g;

export function sanitizeObjectKeyComponent(input: string) {
  const basename = input.split(/[/\\]/).pop() ?? input;
  const trimmed = basename.trim();
  if (!trimmed) return "file";

  const normalized = trimmed.replace(SAFE_KEY_CHARS, "-").replace(/-+/g, "-");
  return normalized.slice(0, 120) || "file";
}

export function buildExportObjectKey(input: {
  wallet: string;
  projectId: string;
  exportId: string;
  kind: "video" | "thumbnail";
  fileName: string;
}) {
  const wallet = input.wallet.trim().toLowerCase();
  const fileName = sanitizeObjectKeyComponent(input.fileName);
  const suffix = crypto.randomUUID();

  return [
    "exports",
    wallet,
    input.projectId.trim(),
    input.exportId.trim(),
    input.kind,
    `${suffix}-${fileName}`,
  ].join("/");
}

export function buildDatasetObjectKey(input: {
  wallet: string;
  datasetId: string;
  kind: "dataset" | "thumbnail";
  fileName: string;
}) {
  const wallet = input.wallet.trim().toLowerCase();
  const fileName = sanitizeObjectKeyComponent(input.fileName);
  const suffix = crypto.randomUUID();

  return [
    "datasets",
    wallet,
    input.datasetId.trim(),
    input.kind,
    `${suffix}-${fileName}`,
  ].join("/");
}
