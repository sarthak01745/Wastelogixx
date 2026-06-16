import { api } from "./client";
import type { AuthResponse, User, UserRole } from "@/types/domain";

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },
  register: async (payload: { name: string; email: string; password: string; role: UserRole }) => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },
  me: async () => {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
};
