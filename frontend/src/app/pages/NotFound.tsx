import { useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-lime-50 px-6 py-16 flex items-center justify-center">
      <div className="mx-auto max-w-md w-full rounded-3xl bg-white p-8 sm:p-10 text-center shadow-xl border border-slate-100">
        <div className="flex justify-center mb-5">
          <BrandMark size={72} showBorder={false} />
        </div>
        <div className="mt-2 inline-flex items-center rounded-full border border-lime-300 bg-lime-100 px-4 py-2 text-sm font-semibold text-teal-800">
          Lỗi 404
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Không tìm thấy trang
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border-2 border-slate-200 px-6 py-3 text-sm font-bold text-slate-700"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
