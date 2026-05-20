import { useEffect, useMemo, useState } from "react";
import { settingsApi } from "../../api/settingsApi";

const fallbackSlogan =
  "🔥 CUỘC THI TÌM HIỂU PHÁP LUẬT PHÒNG, CHỐNG MA TÚY NĂM 2025 | HÀNG NGÀN THÍ SINH ĐANG THAM GIA | THI NGAY HÔM NAY 🔥";

export default function MarqueeBanner() {
  const [slogan, setSlogan] = useState<string>(fallbackSlogan);

  useEffect(() => {
    let mounted = true;
    settingsApi
      .getSlogan()
      .then((res) => {
        const value = res.data.data;
        if (mounted && value) {
          setSlogan(value);
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
    <div className="fixed top-0 left-0 right-0 h-12 overflow-hidden bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-green-900 border-y-2 border-yellow-300 shadow-lg z-[60] w-full">
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <div
        className="flex h-full items-center gap-8 whitespace-nowrap px-8"
        style={{ animation: "marquee 35s linear infinite" }}
      >
        {repeated.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-8">
            <span className="text-sm md:text-base font-black uppercase tracking-widest drop-shadow-sm">
              {item}
            </span>
            <span className="text-green-800 text-lg">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
