import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, LogIn } from "lucide-react";
import { authApi } from "../../../api/authApi";
import BrandMark from "../../components/BrandMark";
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
      navigate("/admin/bang-diem");
    } catch (err) {
      setError(extractApiError(err, "Đăng nhập thất bại."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2a74] via-[#123e9c] to-[#071946] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/20">
        <div className="bg-gradient-to-b from-[#1746b8] to-[#0f3592] px-6 py-6 text-center text-white">
          <BrandMark size={58} className="mx-auto drop-shadow-md" />
          <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-yellow-300">
            TỈNH ĐOÀN NGHỆ AN
          </p>
          <h1 className="mt-1 text-base font-black uppercase text-white leading-tight">
            HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI 2026
          </h1>
          <p className="text-xs text-blue-100/90 mt-1">Cổng Quản Trị Hệ Thống</p>
        </div>
        <div className="p-6">
          {expired && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Tên đăng nhập
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-blue-600 focus:outline-none transition-colors"
                value={username}
                placeholder="admin"
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Mật khẩu
              </label>
              <input
                type="password"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-blue-600 focus:outline-none transition-colors"
                value={password}
                placeholder="••••••••"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1746b8] hover:bg-[#10348c] py-3 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Đang đăng nhập..." : "Đăng nhập Quản trị"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
