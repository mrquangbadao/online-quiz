import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { adminApi } from "../../../api/admin/adminApi";
import { toast } from "../../components/ui/Toast";
import { extractApiError } from "../../../hooks/useApiError";
import { AdminSidebar } from "./AdminDashboard";

export default function AdminChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isTooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu không khớp.");
      return;
    }
    try {
      await adminApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đổi mật khẩu thành công.");
    } catch (err) {
      toast.error(extractApiError(err, "Không thể đổi mật khẩu."));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar active="change-password" />
      <div className="flex-1 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">Đổi mật khẩu</div>
            <div className="text-sm text-slate-400">
              Cập nhật thông tin bảo mật tài khoản
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-md rounded-2xl border border-white/5 bg-slate-900 p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Mật khẩu hiện tại
              </label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">
                Mật khẩu mới
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              {isTooShort && (
                <div className="mt-1 text-xs text-red-400">
                  Mật khẩu mới phải có ít nhất 8 ký tự.
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">
                Xác nhận mật khẩu mới
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {mismatch && (
                <div className="mt-1 text-xs text-red-400">
                  Xác nhận mật khẩu không khớp.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-500"
            >
              Cập nhật mật khẩu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
