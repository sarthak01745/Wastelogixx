import { authStorageKey } from "@/services/api/client";
import type { AuthResponse } from "@/types/domain";

export const authStorage = {
  get() {
    const raw = localStorage.getItem(authStorageKey);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  },
  set(value: AuthResponse) {
    localStorage.setItem(authStorageKey, JSON.stringify(value));
  },
  clear() {
    localStorage.removeItem(authStorageKey);
  },
};
