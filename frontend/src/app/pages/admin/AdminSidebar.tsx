import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import BrandMark from '../../components/BrandMark';
import {
  Activity, Users, FileText, Building2, Settings,
  UserPlus, KeyRound, LogOut, ExternalLink, Menu, X, ShieldCheck, Trophy
} from 'lucide-react';

interface AdminSidebarProps {
  active: string;
}

export default function AdminSidebar({ active }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { username, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuGroups = [
    {
      group: 'Vòng Chung kết (Sân khấu)',
      items: [
        { key: 'live-config', altKey: 'chung-ket-config', label: 'Cấu hình Vòng CK', icon: Settings, path: '/admin/chung-ket-config' },
        { key: 'live-control', altKey: 'chung-ket', label: 'Điều hành Vòng CK', icon: Trophy, path: '/admin/chung-ket' },
      ],
    },
    {
      group: 'Tổ chức thi',
      items: [
        { key: 'dashboard', altKey: 'bang-diem', label: 'Bảng điểm trực tiếp', icon: Activity, path: '/admin/bang-diem' },
        { key: 'eligible-contestants', altKey: 'thi-sinh', label: 'Thí sinh', icon: Users, path: '/admin/thi-sinh' },
      ],
    },
    {
      group: 'Nội dung & Dữ liệu',
      items: [
        { key: 'questions', altKey: 'cau-hoi', label: 'Ngân hàng câu hỏi', icon: FileText, path: '/admin/cau-hoi' },
        { key: 'units', altKey: 'don-vi', label: 'Đơn vị', icon: Building2, path: '/admin/don-vi' },
        { key: 'settings', altKey: 'cai-dat', label: 'Cấu hình đợt thi', icon: Settings, path: '/admin/cai-dat' },
      ],
    },
    {
      group: 'Hệ thống',
      items: [
        { key: 'accounts', altKey: 'tai-khoan', label: 'Tài khoản Quản trị', icon: UserPlus, path: '/admin/tai-khoan' },
        { key: 'change-password', altKey: 'doi-mat-khau', label: 'Đổi mật khẩu', icon: KeyRound, path: '/admin/doi-mat-khau' },
      ],
    },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/dang-nhap');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Brand Header ── */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BrandMark size={40} showBorder={false} />
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-yellow-300">TỈNH ĐOÀN NGHỆ AN</p>
            <p className="text-sm font-extrabold text-white leading-tight">Hệ Thống Quản Trị</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Quick Link: View Public Quiz Page ── */}
      <div className="px-3 pt-3 shrink-0">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-blue-200 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition-all group"
          title="Mở trang chủ / giao diện thí sinh trong tab mới"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Xem trang chủ</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-blue-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>

      {/* ── Navigation Links (Grouped) ── */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto min-h-0">
        {menuGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-300/50 mb-1">
              {grp.group}
            </p>
            {grp.items.map((link) => {
              const isActive = active === link.key || active === link.altKey;
              return (
                <button
                  key={link.key}
                  onClick={() => handleNav(link.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md font-bold border-l-4 border-yellow-400 pl-2.5'
                      : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <link.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-yellow-300' : 'text-blue-300/70'}`} />
                  <span className="truncate">{link.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Profile Badge & Logout ── */}
      <div className="p-3 border-t border-white/10 bg-black/15 space-y-2 shrink-0">
        {/* Profile Card */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-yellow-300 font-bold text-xs shrink-0 uppercase">
            {username ? username.slice(0, 2) : <ShieldCheck className="w-5 h-5 text-yellow-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {username || 'Quản trị viên'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-blue-200/70">Ban Tổ Chức</span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 border border-rose-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Topbar (Shown only on lg:hidden) ── */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-gradient-to-r from-[#0b286d] to-[#0d348a] border-b border-blue-900/50 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <BrandMark size={32} showBorder={false} />
          <div>
            <p className="text-[9px] font-black tracking-widest uppercase text-yellow-300 leading-none">TỈNH ĐOÀN NGHỆ AN</p>
            <p className="text-xs font-extrabold text-white leading-tight mt-0.5">Hệ Thống Quản Trị</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-white/10 text-blue-200 hover:text-white"
            title="Xem trang chủ"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer (Slide-over) ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] bg-gradient-to-b from-[#0b286d] via-[#0d348a] to-[#081d52] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Desktop Fixed Sidebar (lg:flex) ── */}
      <aside className="hidden lg:flex w-72 bg-gradient-to-b from-[#0b286d] via-[#0d348a] to-[#081d52] flex-col shrink-0 border-r border-blue-900/40 fixed inset-y-0 left-0 z-30 h-screen">
        {sidebarContent}
      </aside>
      {/* ── Spacer for desktop flex flow ── */}
      <div className="hidden lg:block w-72 shrink-0" aria-hidden="true" />
    </>
  );
}
