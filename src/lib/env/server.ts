import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().min(1).optional(),
);

const serverSchema = z.object({
  OPENAI_BYOK_COOKIE_SECRET: optionalNonEmptyString,
  PINATA_JWT: optionalNonEmptyString,
  B2_S3_ENDPOINT: optionalNonEmptyString,
  B2_S3_REGION: optionalNonEmptyString,
  B2_ACCESS_KEY_ID: optionalNonEmptyString,
  B2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  B2_BUCKET: optionalNonEmptyString,
  B2_PUBLIC_BASE_URL: optionalNonEmptyString,
});

export const serverEnv = serverSchema.parse({
  OPENAI_BYOK_COOKIE_SECRET: process.env.OPENAI_BYOK_COOKIE_SECRET,
  PINATA_JWT: process.env.PINATA_JWT,
  B2_S3_ENDPOINT: process.env.B2_S3_ENDPOINT,
  B2_S3_REGION: process.env.B2_S3_REGION,
  B2_ACCESS_KEY_ID: process.env.B2_ACCESS_KEY_ID,
  B2_SECRET_ACCESS_KEY: process.env.B2_SECRET_ACCESS_KEY,
  B2_BUCKET: process.env.B2_BUCKET,
  B2_PUBLIC_BASE_URL: process.env.B2_PUBLIC_BASE_URL,
});
