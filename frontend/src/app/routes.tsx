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
import AdminEligibleContestants from "./pages/admin/AdminEligibleContestants";
import LivePlayerMobile from "./pages/live/LivePlayerMobile";
import LiveScreenHost from "./pages/live/LiveScreenHost";
import AdminLiveControl from "./pages/admin/AdminLiveControl";
import AdminLiveConfig from "./pages/admin/AdminLiveConfig";
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
        <div className="min-h-screen bg-white flex flex-col pt-12 overflow-x-hidden w-full" style={{ fontFamily: '"Be Vietnam Pro", sans-serif' }}>
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
    return <Navigate to="/admin/dang-nhap?expired=1" replace />;
  }
 
  if (!isAuthenticated) return <Navigate to="/admin/dang-nhap" replace />;
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
      { path: "thi", Component: Quiz },
      { path: "quiz", Component: () => <Navigate to="/thi" replace /> },
      { path: "ket-qua", Component: Result },
      { path: "result", Component: () => <Navigate to="/ket-qua" replace /> },
 
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/live/play",
    Component: LivePlayerMobile,
  },
  {
    element: <AdminGuard />,
    children: [
      {
        path: "/live/screen",
        Component: LiveScreenHost,
      },
    ],
  },
  {
    path: "/admin/dang-nhap",
    Component: AdminLogin,
  },
  {
    path: "/admin/login",
    Component: () => <Navigate to="/admin/dang-nhap" replace />,
  },
  {
    path: "/admin",
    Component: AdminGuard,
    children: [
      { index: true, Component: () => <Navigate to="bang-diem" replace /> },
      // Vietnamese primary slugs
      { path: "bang-diem", Component: AdminDashboard },
      { path: "live-control", Component: AdminLiveControl },
      { path: "chung-ket", Component: AdminLiveControl },
      { path: "chung-ket-config", Component: AdminLiveConfig },
      { path: "thi-sinh", Component: AdminEligibleContestants },
      { path: "cau-hoi", Component: AdminQuestions },
      { path: "don-vi", Component: AdminUnits },
      { path: "cai-dat", Component: AdminSettings },
      { path: "doi-mat-khau", Component: AdminChangePassword },
      { path: "tai-khoan", Component: AdminAccounts },
      { path: "dot-thi/:phaseId/vinh-danh", Component: AdminPhaseLeaderboard },
      { path: "bai-thi/:examId", Component: AdminExamDetail },

      // Backward compatible aliases
      { path: "dashboard", Component: () => <Navigate to="/admin/bang-diem" replace /> },
      { path: "tong-quan", Component: () => <Navigate to="/admin/bang-diem" replace /> },
      { path: "eligible-contestants", Component: () => <Navigate to="/admin/thi-sinh" replace /> },
      { path: "questions", Component: () => <Navigate to="/admin/cau-hoi" replace /> },
      { path: "units", Component: () => <Navigate to="/admin/don-vi" replace /> },
      { path: "settings", Component: () => <Navigate to="/admin/cai-dat" replace /> },
      { path: "change-password", Component: () => <Navigate to="/admin/doi-mat-khau" replace /> },
      { path: "accounts", Component: () => <Navigate to="/admin/tai-khoan" replace /> },
      { path: "phase/:phaseId/leaderboard", Component: AdminPhaseLeaderboard },
      { path: "dot-thi/:phaseId/xep-hang", Component: AdminPhaseLeaderboard },
      { path: "exam/:examId", Component: AdminExamDetail },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);