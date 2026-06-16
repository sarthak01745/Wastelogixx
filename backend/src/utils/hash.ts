import { createHash } from "crypto";

export const hashValue = (value: unknown) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

export const chainHash = (previousHash: string | null | undefined, payload: unknown) =>
  hashValue({
    previousHash: previousHash ?? "GENESIS",
    payload,
  });
