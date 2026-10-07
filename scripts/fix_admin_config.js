const fs = require('fs');

const filePath = 'd:/Project/online-quiz-doan/frontend/src/app/pages/admin/AdminLiveConfig.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove activeTab setting lines 99-102 that broke F5 reload
const oldActiveTabCode = `      if (data.currentRound === 1 && data.status !== 'LOBBY') setActiveTab('round1');
      else if (data.currentRound === 2) setActiveTab('round2');
      else if (data.currentRound === 3) setActiveTab('round3');
      else if (data.status === 'FINISHED') setActiveTab('finish');`;

code = code.replace(oldActiveTabCode, '// AdminLiveConfig is strictly for Pre-Contest Setup; activeTab stays setup');

// Also check if setActiveTab is anywhere else in fetchSession
code = code.replace(/setActiveTab\('round1'\);/g, '');
code = code.replace(/setActiveTab\('round2'\);/g, '');
code = code.replace(/setActiveTab\('round3'\);/g, '');
code = code.replace(/setActiveTab\('finish'\);/g, '');

// 2. Add PLAYERS_CONFIGURED to WebSocket listener
code = code.replace(
  "event.eventType === 'SESSION_STATUS_CHANGED' ||",
  "event.eventType === 'PLAYERS_CONFIGURED' ||\n        event.eventType === 'SESSION_STATUS_CHANGED' ||"
);

// 3. Add fileInputRef and handleAvatarFileChange
const stateInsertTarget = '  const [playerModalOpen, setPlayerModalOpen] = useState<boolean>(false);';
const stateInsertContent = `  const [playerModalOpen, setPlayerModalOpen] = useState<boolean>(false);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa 5MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPlayerFormData((prev) => ({ ...prev, avatarUrl: dataUrl }));
          toast.success('Đã tải ảnh lên thành công!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };`;

code = code.replace(stateInsertTarget, stateInsertContent);

// 4. Remove position from playerFormData in openAddPlayerModal & openEditPlayerModal
code = code.replace("position: 'Bí thư Đoàn cơ sở',\n      email:", "email:");
code = code.replace("position: p.position || 'Bí thư Đoàn cơ sở',\n      email:", "email:");
code = code.replace("position: playerFormData.position.trim(),\n        email:", "position: '',\n        email:");

// 5. In table: remove position line under full name
code = code.replace(
  `<div className="font-bold text-slate-900 text-sm">{p.fullName}</div>\n                                <div className="text-[11px] text-slate-500 mt-0.5">{p.position || 'Bí thư Đoàn cơ sở'}</div>`,
  `<div className="font-bold text-slate-900 text-sm">{p.fullName}</div>`
);

// 6. In Modal: Remove "Chức vụ Đoàn" input and replace "Link ảnh đại diện (Avatar URL)" with file upload
const oldModalFormTarget = `              <div>
                <label className="text-slate-500 font-bold block mb-1">Chức vụ Đoàn:</label>
                <input
                  type="text"
                  placeholder="Bí thư Đoàn xã ..., Bí thư Đoàn cơ sở..."
                  value={playerFormData.position}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, position: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Email nhận mã OTP:</label>
                  <input
                    type="email"
                    placeholder="email@gmail.com..."
                    value={playerFormData.email}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-amber-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Số điện thoại liên hệ:</label>
                  <input
                    type="text"
                    placeholder="0912..."
                    value={playerFormData.phone}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Link ảnh đại diện (Avatar URL):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={playerFormData.avatarUrl}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, avatarUrl: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-600 text-xs"
                  />
                  {playerFormData.avatarUrl && (
                    <img
                      src={playerFormData.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover border border-slate-300"
                    />
                  )}
                </div>
              </div>`;

const newModalFormReplacement = `              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Email nhận mã OTP:</label>
                  <input
                    type="email"
                    placeholder="email@gmail.com..."
                    value={playerFormData.email}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-amber-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Số điện thoại liên hệ:</label>
                  <input
                    type="text"
                    placeholder="0912..."
                    value={playerFormData.phone}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              {/* TẢI ẢNH ĐẠI DIỆN LÊN (FILE UPLOAD) */}
              <div>
                <label className="text-slate-500 font-bold block mb-1">Ảnh đại diện thí sinh (Tải file ảnh lên):</label>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                
                {playerFormData.avatarUrl ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <img
                      src={playerFormData.avatarUrl}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400 shadow-md"
                    />
                    <div className="flex-1 space-y-1.5">
                      <p className="text-xs font-bold text-slate-800">Đã chọn ảnh đại diện</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
                        >
                          Thay đổi ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerFormData({ ...playerFormData, avatarUrl: '' })}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-4 text-center bg-slate-50 hover:bg-blue-50/50 transition-colors flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-600">Bấm để tải ảnh đại diện lên</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ JPG, PNG, WEBP (Tối đa 5MB)</p>
                    </div>
                  </button>
                )}
              </div>`;

code = code.replace(oldModalFormTarget, newModalFormReplacement);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated AdminLiveConfig.tsx with avatar file upload, no position, and F5 fix!');
