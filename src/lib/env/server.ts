import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().min(1).optional(),
);

const serverSchema = z.object({
  OPENAI_API_KEY: optionalNonEmptyString,
  PINATA_JWT: optionalNonEmptyString,
});

export const serverEnv = serverSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PINATA_JWT: process.env.PINATA_JWT,
});
