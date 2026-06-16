import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

type SupabaseRestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
};

const parseResponse = async <T>(response: Response) => {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : null;
  const errorData = data as {
    message?: string;
    msg?: string;
    details?: string;
    hint?: string;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorData?.message ?? errorData?.msg ?? errorData?.details ?? "Supabase data request failed",
    );
  }

  return data as T;
};

export const supabaseRest = async <T>(path: string, options: SupabaseRestOptions = {}) => {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return parseResponse<T>(response);
};
