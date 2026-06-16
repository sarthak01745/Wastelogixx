import { Outlet } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { adminNavItems, adminShellSubtitle, adminShellTitle } from "@/features/admin/admin-config";

const AdminLayout = () => {
  return (
    <AppShell role="ADMIN" subtitle={adminShellSubtitle} title={adminShellTitle} navItems={adminNavItems}>
      <Outlet />
    </AppShell>
  );
};

export default AdminLayout;
