import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, LogIn } from "lucide-react";
import { authApi } from "../../../api/authApi";
import VietnamEmblem from "../../components/VietnamEmblem";
import { useAuthStore } from "../../../store/authStore";
import { extractApiError } from "../../../hooks/useApiError";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();

  const expired = params.get("expired") === "1";

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(username.trim(), password);
      const data = res.data.data;
      login(data.token, data.username);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(extractApiError(err, "Đăng nhập thất bại."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-lime-50 px-4 py-12">
      <div className="mx-auto max-w-sm overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="bg-gradient-to-r from-emerald-600 via-lime-300 to-amber-200 px-6 py-5 text-center text-teal-900">
          <VietnamEmblem size={56} className="mx-auto" />
          <h1 className="mt-4 text-xl font-bold">Admin Panel</h1>
          <p className="text-sm font-semibold">Tìm hiểu pháp luật Phòng, chống ma túy năm 2025</p>
        </div>
        <div className="p-6">
          {expired && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Clock className="mt-0.5 h-4 w-4" />
              Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Tên đăng nhập
              </label>
              <input
                className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Mật khẩu
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          </div>
        </div>
      </div>
  );
}
