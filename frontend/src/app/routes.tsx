import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { ConfigProvider } from 'antd';
import Landing from "./pages/Landing";
import Quiz from "./pages/Quiz";
import Result from "./pages/Result";
// Leaderboard removed from public routes
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminUnits from "./pages/admin/AdminUnits";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPhaseLeaderboard from "./pages/admin/AdminPhaseLeaderboard";
import AdminExamDetail from "./pages/admin/AdminExamDetail";
import AdminChangePassword from "./pages/admin/AdminChangePassword";
import AdminAccounts from "./pages/admin/AdminAccounts";
import { useAuthStore } from "../store/authStore";
import ErrorBoundary from "./components/ErrorBoundary";
import MarqueeBanner from "./components/MarqueeBanner";
import { ToastContainer } from "./components/ui/Toast";
 
/** Decode JWT payload and return whether the token is expired. */
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp !== 'number') return false; // no exp claim = not expiring
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
 
function RootLayout() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0D5C63',
          borderRadius: 12,
          fontFamily: '"Be Vietnam Pro", sans-serif',
        },
      }}
    >
      <ErrorBoundary>
        <ToastContainer />
        <div className="min-h-screen bg-white flex flex-col pt-12" style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>
          <MarqueeBanner />
          <Outlet />
        </div>
      </ErrorBoundary>
    </ConfigProvider>
  );
}
 
function AdminGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
 
  const expired = isAuthenticated && isTokenExpired(token);
 
  if (expired) {
    logout(); // clear stale auth state
    return <Navigate to="/admin/login?expired=1" replace />;
  }
 
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return (
    <>
      <ToastContainer />
      <Outlet />
    </>
  );
}
 
export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Landing },
      { path: "quiz", Component: Quiz },
      { path: "result", Component: Result },
 
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin",
    Component: AdminGuard,
    children: [
      { index: true, Component: () => <Navigate to="dashboard" replace /> },
      { path: "dashboard", Component: AdminDashboard },
      { path: "questions", Component: AdminQuestions },
      { path: "units", Component: AdminUnits },
      { path: "settings", Component: AdminSettings },
      { path: "change-password", Component: AdminChangePassword },
      { path: "accounts", Component: AdminAccounts },
      { path: "phase/:phaseId/leaderboard", Component: AdminPhaseLeaderboard },
      { path: "exam/:examId", Component: AdminExamDetail },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);