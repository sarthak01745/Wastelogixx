import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { authApi } from "@/services/api/auth";
import { authStorage } from "@/utils/storage";
import type { AuthResponse, User, UserRole } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; role: UserRole }) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(authStorage.get()?.user ?? null);
  const [token, setToken] = useState<string | null>(authStorage.get()?.token ?? null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    const boot = async () => {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const profile = await authApi.me();
        setUser(profile);
      } catch {
        authStorage.clear();
        setUser(null);
        setToken(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void boot();
  }, [token]);

  const persist = (result: AuthResponse) => {
    authStorage.set(result);
    setUser(result.user);
    setToken(result.token);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isBootstrapping,
      login: async (email, password) => {
        const result = await authApi.login(email, password);
        persist(result);
        return result.user;
      },
      register: async (payload) => {
        const result = await authApi.register(payload);
        persist(result);
        return result.user;
      },
      logout: () => {
        authStorage.clear();
        setUser(null);
        setToken(null);
      },
    }),
    [isBootstrapping, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
