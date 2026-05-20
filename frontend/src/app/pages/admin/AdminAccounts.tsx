import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { adminApi } from "../../../api/admin/adminApi";
import { toast } from "../../components/ui/Toast";
import { extractApiError } from "../../../hooks/useApiError";
import { useAuthStore } from "../../../store/authStore";
import { AdminSidebar } from "./AdminDashboard";

interface AdminUser {
  id: number;
  username: string;
  fullName?: string | null;
}

function unwrap<T>(res: any): T {
  return (res?.data?.data ?? res?.data ?? res) as T;
}

export default function AdminAccounts() {
  const { username: currentUsername } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    password: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      const res = await adminApi.listUsers();
      setUsers(unwrap(res) || []);
    } catch (err) {
      toast.error(extractApiError(err, "Không thể tải danh sách tài khoản."));
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async () => {
    if (!form.username.trim() || !form.password) {
      toast.error("Vui lòng nhập đủ thông tin bắt buộc.");
      return;
    }
    try {
      await adminApi.createUser({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim() || undefined,
      });
      setForm({ username: "", fullName: "", password: "" });
      loadUsers();
      toast.success("Đã tạo tài khoản.");
    } catch (err) {
      toast.error(extractApiError(err, "Không thể tạo tài khoản."));
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const user = users.find((item) => item.id === confirmDeleteId);
    if (user?.username === currentUsername) {
      toast.error("Không thể xóa chính mình.");
      setConfirmDeleteId(null);
      return;
    }
    try {
      await adminApi.deleteUser(confirmDeleteId);
      setConfirmDeleteId(null);
      loadUsers();
      toast.success("Đã xóa tài khoản.");
    } catch (err) {
      toast.error(extractApiError(err, "Không thể xóa tài khoản."));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar active="accounts" />
      <div className="flex-1 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">Quản lý tài khoản</div>
            <div className="text-sm text-slate-400">
              Thêm và quản lý tài khoản admin
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
            <div className="text-lg font-bold text-white">Thêm tài khoản mới</div>
            <div className="mt-4 space-y-4">
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                placeholder="Chỉ chữ cái, số và dấu _"
                pattern="^[a-zA-Z0-9_]+$"
                minLength={3}
                maxLength={100}
                value={form.username}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                }
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                placeholder="Tên hiển thị (tuỳ chọn)"
                value={form.fullName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white"
                  placeholder="Mật khẩu"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                Tài khoản mới sẽ có quyền Admin đầy đủ
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-500"
              >
                Tạo tài khoản
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900">
            <div className="border-b border-white/5 px-6 py-4 text-lg font-bold text-white">
              Danh sách tài khoản ({users.length})
            </div>
            <div className="divide-y divide-white/5">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-6 py-4 text-sm"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {user.username}
                      {user.username === currentUsername && (
                        <span className="ml-2 rounded-full bg-teal-500/20 px-2 py-1 text-xs text-teal-400">
                          Bạn
                        </span>
                      )}
                    </div>
                    {user.fullName && (
                      <div className="text-xs text-slate-400">{user.fullName}</div>
                    )}
                    <span className="mt-1 inline-flex rounded-full bg-slate-700 px-2 py-1 text-[11px] text-slate-300">
                      Admin
                    </span>
                  </div>
                  {user.username !== currentUsername && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(user.id)}
                      className="rounded-lg border border-white/10 bg-slate-800 p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white">Xác nhận xóa tài khoản</h3>
            <p className="mt-2 text-sm text-slate-400">
              Bạn chắc chắn muốn xóa tài khoản này?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
