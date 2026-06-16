import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AdminDashboard from "@/pages/AdminDashboard";
import DriverDashboard from "@/pages/DriverDashboard";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Signup from "@/pages/Signup";
import AdminAnalysisPage from "@/pages/admin/AdminAnalysisPage";
import AdminDriversPage from "@/pages/admin/AdminDriversPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminMapPage from "@/pages/admin/AdminMapPage";
import AdminReplayPage from "@/pages/admin/AdminReplayPage";
import AdminRosterPage from "@/pages/admin/AdminRosterPage";
import AdminTasksPage from "@/pages/admin/AdminTasksPage";
import DriverInvoicesPage from "@/pages/driver/DriverInvoicesPage";
import DriverLayout from "@/pages/driver/DriverLayout";
import DriverRoutePage from "@/pages/driver/DriverRoutePage";
import DriverSettingsPage from "@/pages/driver/DriverSettingsPage";
import DriverTripsPage from "@/pages/driver/DriverTripsPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ role, children }: { role: "ADMIN" | "DRIVER"; children: ReactElement }) => {
  const { isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="brutal-card bg-card px-8 py-10 text-center shadow-brutal-lg">
          <div className="text-sm font-semibold text-muted-foreground">Booting workspace</div>
          <div className="mt-3 text-2xl font-black text-foreground">Loading your command center...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === "ADMIN" ? "/app/admin" : "/app/driver"} replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={user ? <Navigate to={user.role === "ADMIN" ? "/app/admin" : "/app/driver"} replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={user.role === "ADMIN" ? "/app/admin" : "/app/driver"} replace /> : <Signup />} />
      <Route
        path="/app/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="map" element={<AdminMapPage />} />
        <Route path="tasks" element={<AdminTasksPage />} />
        <Route path="roster" element={<AdminRosterPage />} />
        <Route path="replay" element={<AdminReplayPage />} />
        <Route path="analysis" element={<AdminAnalysisPage />} />
        <Route path="drivers" element={<AdminDriversPage />} />
      </Route>
      <Route
        path="/app/driver"
        element={
          <ProtectedRoute role="DRIVER">
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DriverDashboard />} />
        <Route path="route" element={<DriverRoutePage />} />
        <Route path="trips" element={<DriverTripsPage />} />
        <Route path="invoices" element={<DriverInvoicesPage />} />
        <Route path="settings" element={<DriverSettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
