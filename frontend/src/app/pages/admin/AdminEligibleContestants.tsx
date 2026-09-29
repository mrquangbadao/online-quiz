import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { eligibleApi } from '../../../api/eligibleApi';
import { adminApi } from '../../../api/admin/adminApi';
import { AdminSidebar } from './AdminDashboard';
import { toast } from '../../components/ui/Toast';
import { extractApiError } from '../../../hooks/useApiError';
import {
  Users, Search, RefreshCw, CheckCircle2, Clock,
  ExternalLink, Download, FileCheck, Phone, Mail, Award, AlertCircle,
  UserPlus, Edit2, Trash2, RotateCcw, UserX, X, Key, Copy, Check, ShieldCheck
} from 'lucide-react';
import type { EligibleContestant } from '../../../types';

export default function AdminEligibleContestants() {
  const navigate = useNavigate();
  const [contestants, setContestants] = useState<EligibleContestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REGISTERED' | 'NOT_REGISTERED' | 'SUBMITTED' | 'IN_PROGRESS'>('ALL');

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContestant, setEditingContestant] = useState<EligibleContestant | null>(null);
  const [formData, setFormData] = useState({
    orderNumber: 1,
    fullName: '',
    unit: '',
    scoreWeek1: '',
    scoreWeek2: '',
    scoreWeek3: '',
    scoreWeek4: '',
    totalScorePreliminary: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete Modal state
  const [deleteCandidate, setDeleteCandidate] = useState<EligibleContestant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset Exam Modal state
  const [resetExamCandidate, setResetExamCandidate] = useState<EligibleContestant | null>(null);
  const [resetExamLoading, setResetExamLoading] = useState(false);

  // Reset Registration Modal state
  const [resetRegCandidate, setResetRegCandidate] = useState<EligibleContestant | null>(null);
  const [resetRegLoading, setResetRegLoading] = useState(false);

  // Support OTP Modal state
  const [supportOtpModalOpen, setSupportOtpModalOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportCandidateName, setSupportCandidateName] = useState('');
  const [supportOtpLoading, setSupportOtpLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<{
    otpCode: string;
    expiresAt: string;
    email: string;
  } | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  const openSupportOtpModal = (email = '', name = '') => {
    setSupportEmail(email);
    setSupportCandidateName(name);
    setGeneratedOtp(null);
    setCopiedOtp(false);
    setSupportOtpModalOpen(true);
  };

  const handleGenerateSupportOtp = async () => {
    if (!supportEmail.trim()) {
      toast.error('Vui lòng nhập địa chỉ email của thí sinh');
      return;
    }
    setSupportOtpLoading(true);
    try {
      const res = await adminApi.generateSupportOtp(supportEmail.trim());
      const data = res.data.data;
      setGeneratedOtp({
        otpCode: data.otpCode,
        expiresAt: data.expiresAt,
        email: data.email,
      });
      toast.success('Đã tạo mã OTP hỗ trợ thành công!');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Không thể tạo mã OTP. Vui lòng kiểm tra lại đợt thi.'));
    } finally {
      setSupportOtpLoading(false);
    }
  };

  const handleCopyOtp = () => {
    if (generatedOtp?.otpCode) {
      navigator.clipboard.writeText(generatedOtp.otpCode);
      setCopiedOtp(true);
      toast.success('Đã sao chép mã OTP vào clipboard!');
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const fetchContestants = async () => {
    setLoading(true);
    try {
      const res = await eligibleApi.getAdminList();
      setContestants(res.data.data || []);
    } catch (err) {
      console.error('Failed to load eligible contestants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestants();
  }, []);

  const openAddModal = () => {
    const nextOrder = contestants.length > 0 ? Math.max(...contestants.map((c) => c.orderNumber)) + 1 : 1;
    setEditingContestant(null);
    setFormData({
      orderNumber: nextOrder,
      fullName: '',
      unit: '',
      scoreWeek1: '',
      scoreWeek2: '',
      scoreWeek3: '',
      scoreWeek4: '',
      totalScorePreliminary: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (c: EligibleContestant) => {
    setEditingContestant(c);
    setFormData({
      orderNumber: c.orderNumber,
      fullName: c.fullName,
      unit: c.unit,
      scoreWeek1: c.scoreWeek1 || '',
      scoreWeek2: c.scoreWeek2 || '',
      scoreWeek3: c.scoreWeek3 || '',
      scoreWeek4: c.scoreWeek4 || '',
      totalScorePreliminary: c.totalScorePreliminary || 0,
    });
    setModalOpen(true);
  };

  const handleSaveContestant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.unit.trim()) {
      toast.error('Họ tên và Đơn vị không được để trống');
      return;
    }
    setSaving(true);
    try {
      if (editingContestant) {
        await eligibleApi.update(editingContestant.id, formData);
        toast.success(`Đã cập nhật thông tin "${formData.fullName}"`);
      } else {
        await eligibleApi.create(formData);
        toast.success(`Đã thêm thí sinh "${formData.fullName}" thành công`);
      }
      setModalOpen(false);
      fetchContestants();
    } catch (err) {
      toast.error(extractApiError(err, 'Lưu thông tin thí sinh thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContestant = async () => {
    if (!deleteCandidate) return;
    setDeleteLoading(true);
    try {
      await eligibleApi.delete(deleteCandidate.id);
      toast.success(`Đã xóa thí sinh "${deleteCandidate.fullName}"`);
      setDeleteCandidate(null);
      fetchContestants();
    } catch (err) {
      toast.error(extractApiError(err, 'Xóa thí sinh thất bại'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetExam = async () => {
    if (!resetExamCandidate || !resetExamCandidate.examId) return;
    setResetExamLoading(true);
    try {
      await adminApi.resetExam(resetExamCandidate.examId);
      toast.success(`Đã xóa bài thi của "${resetExamCandidate.fullName}". Thí sinh có thể thi lại.`);
      setResetExamCandidate(null);
      fetchContestants();
    } catch (err) {
      toast.error(extractApiError(err, 'Cho thi lại thất bại'));
    } finally {
      setResetExamLoading(false);
    }
  };

  const handleResetRegistration = async () => {
    if (!resetRegCandidate) return;
    setResetRegLoading(true);
    try {
      await eligibleApi.resetRegistration(resetRegCandidate.id);
      toast.success(`Đã hủy kích hoạt đăng ký của "${resetRegCandidate.fullName}". Thí sinh có thể đăng ký lại.`);
      setResetRegCandidate(null);
      fetchContestants();
    } catch (err) {
      toast.error(extractApiError(err, 'Hủy kích hoạt thất bại'));
    } finally {
      setResetRegLoading(false);
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return contestants.filter((c) => {
      // Search text match
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        c.fullName.toLowerCase().includes(term) ||
        c.unit.toLowerCase().includes(term) ||
        String(c.orderNumber).includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // Status filter
      if (statusFilter === 'REGISTERED') return c.isRegistered;
      if (statusFilter === 'NOT_REGISTERED') return !c.isRegistered;
      if (statusFilter === 'SUBMITTED') return c.examStatus === 'SUBMITTED';
      if (statusFilter === 'IN_PROGRESS') return c.examStatus === 'IN_PROGRESS';
      return true;
    });
  }, [contestants, searchTerm, statusFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = contestants.length;
    const registered = contestants.filter((c) => c.isRegistered).length;
    const submitted = contestants.filter((c) => c.examStatus === 'SUBMITTED').length;
    const inProgress = contestants.filter((c) => c.examStatus === 'IN_PROGRESS').length;
    const submittedExams = contestants.filter((c) => c.examScore != null);
    const maxScore = submittedExams.length > 0 ? Math.max(...submittedExams.map((c) => c.examScore ?? 0)) : null;

    return { total, registered, submitted, inProgress, maxScore };
  }, [contestants]);

  const fmtDuration = (s?: number) => {
    if (s == null) return '—';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const exportCSV = () => {
    const headers = ['STT', 'Họ và tên', 'Đơn vị', 'Điểm Tuần 1', 'Điểm Tuần 2', 'Điểm Tuần 3', 'Điểm Tuần 4', 'Tổng điểm Sơ khảo', 'Trạng thái ĐK', 'SĐT', 'Email', 'Trạng thái thi', 'Điểm thi Vòng loại', 'Thời gian làm bài'];
    const rows = contestants.map((c) => [
      c.orderNumber,
      `"${c.fullName}"`,
      `"${c.unit}"`,
      `"${c.scoreWeek1 || ''}"`,
      `"${c.scoreWeek2 || ''}"`,
      `"${c.scoreWeek3 || ''}"`,
      `"${c.scoreWeek4 || ''}"`,
      c.totalScorePreliminary ?? '',
      c.isRegistered ? 'Đã kích hoạt' : 'Chưa đăng ký',
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      c.examStatus || 'Chưa thi',
      c.examScore ?? '',
      c.examDurationSeconds ? fmtDuration(c.examDurationSeconds) : '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-thi-sinh-vong-loai-cap-tinh-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="eligible-contestants" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-7 h-7 text-teal-600 shrink-0" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                Danh sách Thí sinh
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026 • Danh sách đủ điều kiện chính thức
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-sm font-bold shadow-sm hover:shadow transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm thí sinh</span>
            </button>

            {/* Emergency Support Action */}
            <button
              onClick={() => openSupportOtpModal()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-sm font-bold transition-colors"
              title="Cấp mã OTP khẩn cấp khi thí sinh không nhận được mail"
            >
              <Key className="w-4 h-4 text-amber-600" />
              <span>Cấp OTP khẩn cấp</span>
            </button>

            {/* Utility Actions */}
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Xuất CSV</span>
            </button>

            <button
              onClick={fetchContestants}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-colors"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng số đủ điều kiện</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{stats.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">Theo danh sách Tỉnh đoàn ban hành</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã kích hoạt SĐT/Email</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-black text-blue-600">{stats.registered}</p>
                  <p className="text-xs font-bold text-slate-400">/ {stats.total} ({stats.total > 0 ? Math.round((stats.registered / stats.total) * 100) : 0}%)</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Đã xác thực OTP</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã hoàn thành thi</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-black text-emerald-600">{stats.submitted}</p>
                  <p className="text-xs font-bold text-slate-400">/ {stats.total} ({stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%)</p>
                </div>
                {stats.inProgress > 0 && (
                  <p className="text-xs text-amber-600 font-bold mt-0.5 animate-pulse">
                    {stats.inProgress} thí sinh đang làm bài
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Điểm cao nhất</p>
                <p className="text-3xl font-black text-amber-600 mt-1">
                  {stats.maxScore != null ? `${stats.maxScore} / 30` : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Vòng loại cấp tỉnh</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({contestants.length})
            </button>
            <button
              onClick={() => setStatusFilter('REGISTERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'REGISTERED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã kích hoạt ({stats.registered})
            </button>
            <button
              onClick={() => setStatusFilter('NOT_REGISTERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'NOT_REGISTERED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa kích hoạt ({stats.total - stats.registered})
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã thi ({stats.submitted})
            </button>
            {stats.inProgress > 0 && (
              <button
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                Đang thi ({stats.inProgress})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên, đơn vị, SĐT, SBD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Contestants Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-4">Họ và tên & Đơn vị</th>
                  <th className="py-3 px-4 hidden md:table-cell">Thông tin đăng ký</th>
                  <th className="py-3 px-4 text-center hidden lg:table-cell">Sơ khảo (4 tuần)</th>
                  <th className="py-3 px-4 text-center">Tổng điểm SK</th>
                  <th className="py-3 px-4 text-center">Trạng thái thi Vòng loại</th>
                  <th className="py-3 px-4 text-center w-44">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-400 text-xs">Đang tải danh sách thí sinh...</p>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="font-semibold text-slate-600">Không tìm thấy thí sinh nào</p>
                      <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {c.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{c.fullName}</div>
                        <div className="text-xs text-slate-500">{c.unit}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {c.isRegistered ? (
                          <div className="space-y-0.5">
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                <Phone className="w-3 h-3 text-teal-600" />
                                {c.phone}
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[200px]">{c.email}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            Chưa đăng ký SĐT/Email
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-500 hidden lg:table-cell">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                          <span title="Tuần 1">{c.scoreWeek1 || '—'}</span>
                          <span className="text-slate-300">/</span>
                          <span title="Tuần 2">{c.scoreWeek2 || '—'}</span>
                          <span className="text-slate-300">/</span>
                          <span title="Tuần 3">{c.scoreWeek3 || '—'}</span>
                          <span className="text-slate-300">/</span>
                          <span title="Tuần 4">{c.scoreWeek4 || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {c.totalScorePreliminary != null ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-extrabold text-xs">
                            {c.totalScorePreliminary} đ
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.examStatus === 'SUBMITTED' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {c.examScore} / 30 đ
                            </span>
                            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {fmtDuration(c.examDurationSeconds)}
                            </div>
                          </div>
                        ) : c.examStatus === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Đang làm bài
                          </span>
                        ) : c.isRegistered ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Đã kích hoạt (Chưa thi)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-slate-400">
                            Chưa vào thi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {c.examId && (
                            <>
                              <button
                                onClick={() => navigate(`/admin/bai-thi/${c.examId}`)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold transition-colors"
                                title="Xem chi tiết bài thi"
                              >
                                Xem
                              </button>
                              <button
                                onClick={() => setResetExamCandidate(c)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors"
                                title="Cho thi lại (Xóa bài thi này để thí sinh bắt đầu lại)"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Thi lại
                              </button>
                            </>
                          )}
                          {c.isRegistered && !c.examId && (
                            <button
                              onClick={() => setResetRegCandidate(c)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors"
                              title="Hủy kích hoạt (Xóa SĐT/Email để thí sinh kích hoạt lại nếu nhập sai)"
                            >
                              <UserX className="w-3 h-3" />
                              Reset ĐK
                            </button>
                          )}
                          <button
                            onClick={() => openSupportOtpModal(c.email || '', c.fullName)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                            title="Cấp mã OTP hỗ trợ cho thí sinh này"
                          >
                            <Key className="w-3 h-3" />
                            Cấp OTP
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                            title="Sửa thông tin thí sinh"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(c)}
                            className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Xóa thí sinh này khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Hiển thị <strong>{filteredList.length}</strong> / <strong>{contestants.length}</strong> thí sinh</span>
            <span>Chỉ các thí sinh trong danh sách mới có quyền tham gia Vòng loại cấp tỉnh</span>
          </div>
        </div>

      {/* ── Add / Edit Contestant Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-black text-slate-800">
                {editingContestant ? 'Chỉnh sửa thông tin thí sinh' : 'Thêm thí sinh vào danh sách'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContestant} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">STT / SBD</label>
                  <input
                    type="number"
                    required
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: NGUYỄN VĂN A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Đơn vị (Xã / Phường) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bí thư Đoàn xã Tân Kỳ"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Điểm sơ khảo 4 tuần (Ví dụ: 190, 200...)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Tuần 1"
                    value={formData.scoreWeek1}
                    onChange={(e) => setFormData({ ...formData, scoreWeek1: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                  />
                  <input
                    type="text"
                    placeholder="Tuần 2"
                    value={formData.scoreWeek2}
                    onChange={(e) => setFormData({ ...formData, scoreWeek2: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                  />
                  <input
                    type="text"
                    placeholder="Tuần 3"
                    value={formData.scoreWeek3}
                    onChange={(e) => setFormData({ ...formData, scoreWeek3: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                  />
                  <input
                    type="text"
                    placeholder="Tuần 4"
                    value={formData.scoreWeek4}
                    onChange={(e) => setFormData({ ...formData, scoreWeek4: e.target.value })}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tổng điểm sơ khảo (out of 800)</label>
                <input
                  type="number"
                  placeholder="VD: 790"
                  value={formData.totalScorePreliminary}
                  onChange={(e) => setFormData({ ...formData, totalScorePreliminary: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'LƯU THÔNG TIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Contestant Modal ── */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-red-200">
            <h2 className="text-base font-black text-slate-800">Xác nhận xóa thí sinh</h2>
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa thí sinh <strong>"{deleteCandidate.fullName}"</strong> ({deleteCandidate.unit}) khỏi danh sách đủ điều kiện?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteContestant}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa thí sinh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Exam Modal ── */}
      {resetExamCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-red-200">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-black text-slate-800">Cho thí sinh thi lại</h2>
              <p className="text-xs text-slate-500 mt-1">
                Thí sinh: <strong>{resetExamCandidate.fullName}</strong> ({resetExamCandidate.unit})
              </p>
            </div>
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              ⚠️ Điểm thi hiện tại ({resetExamCandidate.examScore ?? 0} điểm) sẽ bị xóa hoàn toàn. Thí sinh sẽ được phép bắt đầu bài thi mới.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetExamCandidate(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleResetExam}
                disabled={resetExamLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {resetExamLoading ? 'Đang xử lý...' : 'Xác nhận thi lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Registration Modal ── */}
      {resetRegCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-purple-200">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <UserX className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-black text-slate-800">Hủy kích hoạt đăng ký</h2>
              <p className="text-xs text-slate-500 mt-1">
                Thí sinh: <strong>{resetRegCandidate.fullName}</strong> ({resetRegCandidate.unit})
              </p>
            </div>
            <p className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-xl p-3">
              Thông tin SĐT ({resetRegCandidate.phone}) và Email ({resetRegCandidate.email}) đã kích hoạt sẽ được xóa. Thí sinh sẽ có thể đăng ký lại từ đầu với email/SĐT mới.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetRegCandidate(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleResetRegistration}
                disabled={resetRegLoading}
                className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs disabled:opacity-50"
              >
                {resetRegLoading ? 'Đang xử lý...' : 'Xác nhận hủy kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Support OTP Modal (Khẩn cấp cho thí sinh) ── */}
      {supportOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-amber-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">Cấp mã OTP hỗ trợ</h2>
                  <p className="text-xs text-slate-500">Dành cho thí sinh gặp sự cố email</p>
                </div>
              </div>
              <button
                onClick={() => setSupportOtpModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate info if available */}
            {supportCandidateName && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2.5">
                <Award className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold uppercase text-blue-600 tracking-wide">Thí sinh</p>
                  <p className="text-sm font-extrabold text-blue-950">{supportCandidateName}</p>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email của thí sinh:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="nhap.email.thi.sinh@gmail.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Nhập chính xác email mà thí sinh đang sử dụng để đăng ký trên màn hình thi.
              </p>
            </div>

            {/* Generated OTP Display Box */}
            {generatedOtp ? (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 text-center space-y-3 shadow-inner">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mã OTP dùng 1 lần (5 phút)
                </span>

                <div className="py-2">
                  <p className="text-4xl sm:text-5xl font-black text-amber-700 tracking-[0.25em] font-mono select-all">
                    {generatedOtp.otpCode}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleCopyOtp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    {copiedOtp ? (
                      <>
                        <Check className="w-4 h-4" /> Đã sao chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Sao chép mã
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateSupportOtp}
                    disabled={supportOtpLoading}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${supportOtpLoading ? 'animate-spin' : ''}`} />
                    Tạo lại
                  </button>
                </div>

                <p className="text-xs text-amber-900/80 leading-relaxed font-medium pt-1">
                  👉 Đọc mã <strong>{generatedOtp.otpCode}</strong> cho thí sinh để nhập vào màn hình. Mã sẽ tự hủy ngay sau khi xác thực!
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Nhấn nút bên dưới để hệ thống cấp một mã xác thực 6 số có hiệu lực trong 5 phút dành riêng cho email này.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSupportOtpModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Đóng
              </button>
              {!generatedOtp && (
                <button
                  onClick={handleGenerateSupportOtp}
                  disabled={supportOtpLoading || !supportEmail.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {supportOtpLoading ? (
                    'Đang tạo mã...'
                  ) : (
                    <>
                      <Key className="w-4 h-4" /> Tạo mã OTP (5 phút)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
