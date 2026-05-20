import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let _listener: ((toast: ToastItem) => void) | null = null;
let _idCounter = 1;

const emitToast = (type: ToastType, message: string) => {
  if (_listener) {
    _listener({ id: _idCounter++, type, message });
  }
};

export const toast = {
  success: (message: string) => emitToast("success", message),
  error: (message: string) => emitToast("error", message),
  info: (message: string) => emitToast("info", message),
};

const typeStyles: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

const typeIcons: Record<ToastType, JSX.Element> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    _listener = (toastItem) => {
      setToasts((prev) => [...prev, toastItem]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toastItem.id));
      }, 5000);
    };

    return () => {
      _listener = null;
    };
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[320px] flex-col gap-3">
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg ${
            typeStyles[toastItem.type]
          }`}
        >
          {typeIcons[toastItem.type]}
          <div className="flex-1 text-sm font-semibold">
            {toastItem.message}
          </div>
          <button
            type="button"
            onClick={() =>
              setToasts((prev) =>
                prev.filter((item) => item.id !== toastItem.id)
              )
            }
            className="rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
