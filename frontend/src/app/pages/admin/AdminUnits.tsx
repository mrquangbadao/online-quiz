import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { adminApi } from "../../../api/admin/adminApi";
import { toast } from "../../components/ui/Toast";
import { extractApiError } from "../../../hooks/useApiError";
import { AdminSidebar } from "./AdminDashboard";

interface UnitItem {
  id: number;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

function unwrap<T>(res: any): T {
  return (res?.data?.data ?? res?.data ?? res) as T;
}

export default function AdminUnits() {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ name: string; code: string }>({
    name: "",
    code: "",
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);

  const loadUnits = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllUnits();
      setUnits(unwrap(res) || []);
    } catch (err) {
      toast.error(extractApiError(err, "Không thể tải danh sách đơn vị."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.info("Vui lòng nhập tên đơn vị.");
      return;
    }
    try {
      await adminApi.createUnit(newName.trim(), newCode.trim() || undefined);
      setNewName("");
      setNewCode("");
      setShowCreate(false);
      setMessage("Đã tạo đơn vị mới.");
      loadUnits();
    } catch (err) {
      toast.error(extractApiError(err, "Không thể tạo đơn vị."));
    }
  };

  const handleSave = async (unit: UnitItem) => {
    try {
      await adminApi.updateUnit(unit.id, {
        name: editData.name.trim(),
        code: editData.code.trim() || null,
      });
      setEditId(null);
      loadUnits();
      toast.success("Đã cập nhật đơn vị.");
    } catch (err) {
      toast.error(extractApiError(err, "Không thể cập nhật đơn vị."));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteUnit(pendingDelete.id);
      setPendingDelete(null);
      loadUnits();
      toast.success("Đã xóa đơn vị.");
    } catch (err) {
      toast.error(extractApiError(err, "Không thể xóa đơn vị."));
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      await adminApi.importUnits(file);
      setMessage("Đã import danh sách đơn vị.");
      loadUnits();
    } catch (err) {
      toast.error(extractApiError(err, "Không thể import đơn vị."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar active="units" />
      <div className="flex-1 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn vị</h1>
            <p className="text-sm text-slate-500">{units.length} đơn vị</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Đang import" : "Import Excel"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Thêm đơn vị
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </div>

        {message && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")}> <X className="h-4 w-4" /></button>
          </div>
        )}

        {showCreate && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <input
              className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm"
              placeholder="Tên đơn vị *"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <input
              className="w-40 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm"
              placeholder="Mã"
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
            />
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Tạo
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Hủy
            </button>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="rounded-t-2xl bg-lime-300 px-4 py-3 text-sm font-bold text-teal-900">
            Danh sách đơn vị tham dự
          </div>
          <div className="grid grid-cols-5 gap-3 px-4 py-3 text-xs font-semibold text-slate-500">
            <div className="w-12">STT</div>
            <div>Tên đơn vị</div>
            <div className="w-32">Mã</div>
            <div className="w-24">Trạng thái</div>
            <div className="w-28">Thao tác</div>
          </div>
          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-4 text-sm text-slate-500">Đang tải...</div>
            )}
            {units.map((unit, index) => (
              <div
                key={unit.id}
                className="grid grid-cols-5 items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="w-12 text-slate-500">{index + 1}</div>
                {editId === unit.id ? (
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={editData.name}
                    onChange={(event) =>
                      setEditData((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                ) : (
                  <div className="font-semibold text-slate-900">{unit.name}</div>
                )}
                {editId === unit.id ? (
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={editData.code}
                    onChange={(event) =>
                      setEditData((prev) => ({ ...prev, code: event.target.value }))
                    }
                  />
                ) : (
                  <div className="text-slate-600">{unit.code ?? "-"}</div>
                )}
                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      unit.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {unit.isActive ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {editId === unit.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSave(unit)}
                        className="rounded-lg bg-emerald-600 p-2 text-white"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="rounded-lg bg-slate-100 p-2 text-slate-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(unit.id);
                          setEditData({ name: unit.name, code: unit.code ?? "" });
                        }}
                        className="rounded-lg bg-slate-100 p-2 text-slate-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ id: unit.id, name: unit.name })}
                        className="rounded-lg bg-red-50 p-2 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Xác nhận xóa</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn chắc chắn muốn xóa <span className="font-semibold text-slate-900">{pendingDelete.name}</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500">Hành động này không thể hoàn tác.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
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
