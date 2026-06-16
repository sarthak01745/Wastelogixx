import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
export const APP_ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const authStorageKey = "route-shield-auth";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem(authStorageKey);

  if (raw) {
    const parsed = JSON.parse(raw) as { token?: string };

    if (parsed.token) {
      config.headers.Authorization = `Bearer ${parsed.token}`;
    }
  }

  return config;
});
