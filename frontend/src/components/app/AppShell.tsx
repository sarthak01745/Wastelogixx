import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { TransitionLink } from "@/components/shared/TransitionLink";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { useSmoothNavigate } from "@/hooks/useSmoothNavigate";

export type ShellNavItem = {
  label: string;
  to: string;
  end?: boolean;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  role: "ADMIN" | "DRIVER";
  children: ReactNode;
  navItems?: ShellNavItem[];
};

export const AppShell = ({ title, subtitle, role, children, navItems }: AppShellProps) => {
  const { user, logout } = useAuth();
  const smoothNavigate = useSmoothNavigate();
  const resolvedNavItems = navItems ?? [{ label: "Operations deck", to: role === "ADMIN" ? "/app/admin" : "/app/driver", end: false }];

  const handleLogout = () => {
    logout();
    smoothNavigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen w-full max-w-[1640px] gap-2.5 px-2.5 py-2.5 lg:px-3">
        <aside className="hidden h-[calc(100vh-1.25rem)] w-[210px] shrink-0 flex-col justify-between self-start overflow-hidden rounded-[24px] border-3 border-ink bg-paper p-3 shadow-panel lg:sticky lg:top-2.5 lg:flex">
          <div>
            <TransitionLink to="/">
              <BrandMark />
            </TransitionLink>

            <div className="mt-5 space-y-1.5">
              {resolvedNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  activeClassName="active"
                  className="nav-chip"
                  end={item.end ?? true}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="mt-5 rounded-[18px] border-3 border-ink bg-[#111827] p-3 text-white shadow-panel-sm">
              <div className="eyebrow text-white/60">Signed in as</div>
              <div className="mt-1.5 text-[14px] font-black">{user?.name}</div>
              <div className="text-[11px] text-white/70">{user?.email}</div>
              <div className="mt-2.5 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.22em]">
                {role}
              </div>
            </div>
          </div>

          <button className="neo-button justify-center bg-ink text-paper" onClick={handleLogout} type="button">
            <LogOut size={15} />
            Sign out
          </button>
        </aside>

        <main className="flex-1">
          <div className="rounded-[24px] border-3 border-ink bg-paper p-3 shadow-panel lg:p-3.5">
            <div className="flex flex-col gap-2.5 border-b-3 border-dashed border-black/15 pb-3.5">
              <div>
                <div className="eyebrow">{role === "ADMIN" ? "Admin Command" : "Driver Console"}</div>
                <h1 className="mt-1.5 text-[1.65rem] font-black tracking-[-0.05em] text-ink lg:text-[1.85rem]">{title}</h1>
                <p className="mt-1.5 max-w-3xl text-[12px] leading-5 text-ink-muted">{subtitle}</p>
              </div>
            </div>

            {resolvedNavItems.length > 0 ? (
              <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto lg:hidden">
                {resolvedNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    activeClassName="active"
                    className="nav-chip whitespace-nowrap"
                    end={item.end ?? true}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                ))}
                <button className="neo-button whitespace-nowrap bg-ink text-paper" onClick={handleLogout} type="button">
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            ) : null}

            <div className="mt-3.5">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
