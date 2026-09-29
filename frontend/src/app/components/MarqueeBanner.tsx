import { useEffect, useMemo, useState } from "react";
import { settingsApi } from "../../api/settingsApi";

const fallbackSlogan =
  "⭐ TỈNH ĐOÀN NGHỆ AN | HỘI THI BÍ THƯ ĐOÀN CƠ SỞ GIỎI TỈNH NGHỆ AN NĂM 2026 | KHÁT VỌNG CỐNG HIẾN – RÈN ĐỨC LUYỆN TÀI – VỮNG BƯỚC TƯƠNG LAI | 70 CÁN BỘ ĐOÀN TRANH TÀI VÒNG LOẠI CẤP TỈNH ⭐";

export default function MarqueeBanner() {
  const [slogan, setSlogan] = useState<string>(fallbackSlogan);

  useEffect(() => {
    let mounted = true;
    settingsApi
      .getSlogan()
      .then((res) => {
        const value = res.data.data;
        if (mounted && value) {
          // Guard: nếu dữ liệu cũ từ DB chứa thông tin cuộc thi khác, ưu tiên dùng slogan Tỉnh đoàn Nghệ An chuẩn
          if (
            value.toUpperCase().includes("MA TÚY") ||
            value.toUpperCase().includes("CÔNG AN") ||
            !value.toUpperCase().includes("ĐOÀN")
          ) {
            setSlogan(fallbackSlogan);
          } else {
            setSlogan(value);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setSlogan(fallbackSlogan);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sentences = useMemo(() => {
    return slogan
      .split(/\n|\|/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [slogan]);

  const repeated = [...sentences, ...sentences, ...sentences];

  return (
    <div className="fixed top-0 left-0 right-0 h-11 overflow-hidden bg-gradient-to-r from-[#10348c] via-[#1746b8] to-[#1e52d8] text-yellow-300 border-b border-yellow-400/30 shadow-md z-[60] w-full">
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <div
        className="flex h-full items-center gap-8 whitespace-nowrap px-8"
        style={{ animation: "marquee 35s linear infinite" }}
      >
        {repeated.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-8">
            <span className="text-xs md:text-sm font-black uppercase tracking-wider drop-shadow-sm text-white">
              {item}
            </span>
            <span className="text-yellow-400 text-base">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
