import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Star,
  Timer,
  Play,
  CheckCircle2,
  XCircle,
  Award,
  Zap,
  Users,
  Radio,
  ExternalLink,
  RefreshCw,
  Eye,
  Shuffle,
  Save,
  ChevronRight,
  Shield,
  Volume2,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Upload,
  Download,
  Plus,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AdminSidebar from './AdminSidebar';
import { toast } from '../../components/ui/Toast';
import { AlertTriangle } from 'lucide-react';
import { adminLiveApi } from '../../../api/admin/adminLiveApi';
import { liveApi } from '../../../api/liveApi';
import { useLiveSocket } from '../../../hooks/useLiveSocket';
import {
  LiveEventMessage,
  LivePlayerDto,
  LiveRound2Topic,
  LiveRound3Pair,
  LiveSessionDto,
} from '../../../types/live';

export default function AdminLiveConfig() {
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSessionDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'setup'>('setup');
  const [setupSubTab, setSetupSubTab] = useState<'players' | 'questions' | 'r2topics'>('players');
  const [currentQuestionOrder, setCurrentQuestionOrder] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Setup state
  const [setupPlayers, setSetupPlayers] = useState<LivePlayerDto[]>([]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState<string>('');
  const [playerModalOpen, setPlayerModalOpen] = useState<boolean>(false);
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
  };
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    confirmType?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);
  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    orderNumber: 1,
    fullName: '',
    unit: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [setupQuestions, setSetupQuestions] = useState<any[]>([]);
  const [setupR2Topics, setSetupR2Topics] = useState<LiveRound2Topic[]>([]);

  // Lobby warning modal & Avatar Modal
  const [showLobbyWarningModal, setShowLobbyWarningModal] = useState<boolean>(false);
  const [avatarModalPlayer, setAvatarModalPlayer] = useState<LivePlayerDto | null>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState<string>('');

  // Round 2 Inputs
  const [r2PlayerId, setR2PlayerId] = useState<number | ''>('');
  const [r2TopicCode, setR2TopicCode] = useState<string>('ĐỀ 01');
  const [r2Score1, setR2Score1] = useState<number>(18);
  const [r2Score2, setR2Score2] = useState<number>(18);
  const [round2Topics, setRound2Topics] = useState<LiveRound2Topic[]>([]);

  // Round 3 Inputs
  const [r3PlayerId, setR3PlayerId] = useState<number | ''>('');
  const [r3Score, setR3Score] = useState<number>(85);
  const [round3Pairs, setRound3Pairs] = useState<LiveRound3Pair[]>([]);

  // Load session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await liveApi.getActiveSession();
      setSession(data);
      if (data.currentQuestionIndex) {
        setCurrentQuestionOrder(data.currentQuestionIndex);
      }
// AdminLiveConfig is strictly for Pre-Contest Setup; activeTab stays setup

      if (data.id) {
        const topics = await adminLiveApi.getRound2Topics(data.id);
        setRound2Topics(topics);
        setSetupR2Topics(topics);
        const pairs = await adminLiveApi.getRound3Pairs(data.id);
        setRound3Pairs(pairs);
        const questions = await adminLiveApi.getQuestions(data.id);
        setSetupQuestions(questions);
        if (data.players) {
          setSetupPlayers(data.players);
        }
      }
    } catch (err) {
      console.error('Lỗi tải phiên thi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // WebSocket Event Listener
  const handleSocketMessage = useCallback(
    (event: LiveEventMessage) => {
      console.log('[AdminLiveControl WS]', event.eventType, event.payload);
      if (
        event.eventType === 'PLAYERS_CONFIGURED' ||
        event.eventType === 'SESSION_STATUS_CHANGED' ||
        event.eventType === 'PLAYER_CHECKED_IN' ||
        event.eventType === 'HOPE_STAR_ACTIVATED' ||
        event.eventType === 'PLAYER_ANSWERED' ||
        event.eventType === 'ANSWER_REVEALED' ||
        event.eventType === 'LEADERBOARD_UPDATED' ||
        event.eventType === 'ROUND2_TOPIC_ASSIGNED' ||
        event.eventType === 'ROUND2_SCORE_UPDATED' ||
        event.eventType === 'ROUND3_PAIR_DRAWN' ||
        event.eventType === 'ROUND3_SCORE_UPDATED' ||
        event.eventType === 'WINNERS_ANNOUNCED'
      ) {
        fetchSession();
      }
    },
    [fetchSession]
  );

  const { isConnected } = useLiveSocket({
    sessionId: session?.id,
    onMessage: handleSocketMessage,
  });

  // Switch round
  const handleSetRound = async (round: number, status: string) => {
    if (!session) return;
    try {
      setActionLoading(true);
      await adminLiveApi.setRound(session.id, round, status);
      await fetchSession();
    } catch (err) {
      toast.info('Lỗi chuyển chặng thi');
    } finally {
      setActionLoading(false);
    }
  };

  // SETUP ACTIONS - THÍ SINH
  const handleImportTop10 = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      const players = await adminLiveApi.getPreviewTop10(session.id);
      if (!players || players.length === 0) {
        toast.error('Không tìm thấy danh sách thí sinh từ cơ sở dữ liệu Vòng sơ loại!');
        return;
      }
      setSetupPlayers(players);
      toast.success(`Đã nạp ${players.length} thí sinh từ Vòng loại vào bảng tạm. Vui lòng kiểm tra và bấm Lưu danh sách thí sinh.`);
    } catch (err) {
      toast.error('Lỗi lấy danh sách Top 10');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePlayers = async () => {
    if (!session) return;
    const executeSave = async () => {
      try {
        setActionLoading(true);
        const saved = await adminLiveApi.savePlayers(session.id, setupPlayers);
        setSetupPlayers(saved);
        await fetchSession();
        toast.success(`Đã lưu thành công ${saved.length} thí sinh vào đợt thi Vòng Chung kết!`);
      } catch (err) {
        toast.error('Lỗi lưu danh sách thí sinh');
      } finally {
        setActionLoading(false);
      }
    };

    if (setupPlayers.length === 0) {
      setConfirmDialog({
        title: 'Cảnh báo danh sách trống',
        message: 'Danh sách thí sinh hiện đang trống. Bạn có chắc chắn muốn lưu danh sách trống vào đợt thi?',
        confirmText: 'Vẫn lưu',
        confirmType: 'warning',
        onConfirm: executeSave,
      });
      return;
    }

    // Kiểm tra tất cả thí sinh đều phải có email hợp lệ
    const invalidPlayer = setupPlayers.find((p) => !p.email || !p.email.trim());
    if (invalidPlayer) {
      toast.error(`Thí sinh "${invalidPlayer.fullName || 'SBD ' + invalidPlayer.orderNumber}" chưa có email! Vui lòng cập nhật email trước khi lưu.`);
      return;
    }

    executeSave();
  };

  const openAddPlayerModal = () => {
    setEditingPlayerIndex(null);
    setPlayerFormData({
      orderNumber: setupPlayers.length + 1,
      fullName: '',
      unit: '',
      email: '',
      phone: '',
      avatarUrl: '',
    });
    setPlayerModalOpen(true);
  };

  const openEditPlayerModal = (idx: number) => {
    const p = setupPlayers[idx];
    setEditingPlayerIndex(idx);
    setPlayerFormData({
      orderNumber: p.orderNumber || idx + 1,
      fullName: p.fullName || '',
      unit: p.unit || '',
      email: p.email || '',
      phone: p.phone || '',
      avatarUrl: p.avatarUrl || '',
    });
    setPlayerModalOpen(true);
  };

  const handleSavePlayerForm = () => {
    if (!playerFormData.fullName.trim()) {
      toast.error('Vui lòng nhập Họ và tên thí sinh!');
      return;
    }
    if (!playerFormData.unit.trim()) {
      toast.error('Vui lòng nhập Đơn vị trực thuộc!');
      return;
    }
    if (!playerFormData.email.trim()) {
      toast.error('Vui lòng nhập Email của thí sinh! Email là bắt buộc để gửi mã OTP đăng nhập.');
      return;
    }
    const emailRegex = /^[A-Za-z0-9+_.-]+@(.+)$/;
    if (!emailRegex.test(playerFormData.email.trim())) {
      toast.error('Địa chỉ Email không đúng định dạng!');
      return;
    }

    const updated = [...setupPlayers];
    if (editingPlayerIndex !== null && editingPlayerIndex >= 0) {
      updated[editingPlayerIndex] = {
        ...updated[editingPlayerIndex],
        ...playerFormData,
      };
    } else {
      updated.push({
        id: Date.now(),
        sessionId: session?.id || 0,
        orderNumber: playerFormData.orderNumber || (setupPlayers.length + 1),
        fullName: playerFormData.fullName.trim(),
        unit: playerFormData.unit.trim(),
        position: '',
        email: playerFormData.email.trim(),
        phone: playerFormData.phone.trim(),
        avatarUrl: playerFormData.avatarUrl.trim(),
        isCheckedIn: false,
        hopeStarUsed: false,
        round1Score: 0,
        round1TotalTimeMs: 0,
        round2Score: 0,
        round3Score: 0,
        totalScore: 0,
      });
    }
    setSetupPlayers(updated);
    setPlayerModalOpen(false);
  };

  const handleDeletePlayer = (idx: number) => {
    const target = setupPlayers[idx];
    setConfirmDialog({
      title: 'Xóa thí sinh khỏi danh sách',
      message: `Xác nhận xóa thí sinh "${target.fullName}" khỏi danh sách Vòng Chung kết?`,
      confirmText: 'Xóa thí sinh',
      confirmType: 'danger',
      onConfirm: () => {
        const updated = setupPlayers.filter((_, i) => i !== idx).map((p, i) => ({
          ...p,
          orderNumber: i + 1,
        }));
        setSetupPlayers(updated);
        toast.success(`Đã xóa thí sinh "${target.fullName}"`);
      },
    });
  };

  const filteredSetupPlayers = useMemo(() => {
    if (!playerSearchTerm.trim()) return setupPlayers;
    const term = playerSearchTerm.toLowerCase().trim();
    return setupPlayers.filter(
      (p) =>
        p.fullName?.toLowerCase().includes(term) ||
        p.unit?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.phone?.includes(term) ||
        String(p.orderNumber).includes(term)
    );
  }, [setupPlayers, playerSearchTerm]);

  const excelInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleDownloadQuestionTemplate = () => {
    const sampleData = [
      {
        'STT': 1,
        'Nội dung câu hỏi': 'Hội thi Bí thư Đoàn cơ sở giỏi tỉnh Nghệ An năm 2026 do đơn vị nào tổ chức?',
        'Phương án A': 'Ban Thường vụ Tỉnh đoàn Nghệ An',
        'Phương án B': 'Đoàn Khối các cơ quan tỉnh',
        'Phương án C': 'Thành đoàn Vinh',
        'Phương án D': 'Huyện đoàn Nam Đàn',
        'Đáp án đúng': 'Ban Thường vụ Tỉnh đoàn Nghệ An',
        'Thời gian (giây)': 40,
        'Link Video': '',
        'Giải thích': 'Căn cứ Kế hoạch tổ chức Hội thi của Ban Thường vụ Tỉnh đoàn Nghệ An',
      },
      {
        'STT': 2,
        'Nội dung câu hỏi': 'Nghị quyết Đại hội Đoàn toàn quốc lần thứ XII đề ra chỉ tiêu bao nhiêu thanh niên được giới thiệu việc làm?',
        'Phương án A': '2.000.000 thanh niên',
        'Phương án B': '2.500.000 thanh niên',
        'Phương án C': '3.000.000 thanh niên',
        'Phương án D': '3.500.000 thanh niên',
        'Đáp án đúng': '2.500.000 thanh niên',
        'Thời gian (giây)': 40,
        'Link Video': '',
        'Giải thích': 'Văn kiện Đại hội Đoàn toàn quốc lần thứ XII, nhiệm kỳ 2022 - 2027',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CauHoiVong1');
    XLSX.writeFile(wb, 'template_cau_hoi_vong_1.xlsx');
    toast.success('Đã tải xuống file Excel mẫu câu hỏi Vòng 1 thành công!');
  };

  const handleImportQuestionsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          toast.error('File Excel không có dữ liệu câu hỏi!');
          return;
        }

        const parsedQuestions = rows.map((r, idx) => {
          const order = Number(r['STT'] || r['stt'] || r['Thứ tự'] || idx + 1);
          const title = String(r['Nội dung câu hỏi'] || r['Câu hỏi'] || r['title'] || r['Title'] || '').trim();
          const optA = String(r['Phương án A'] || r['A'] || r['optionA'] || '').trim();
          const optB = String(r['Phương án B'] || r['B'] || r['optionB'] || '').trim();
          const optC = String(r['Phương án C'] || r['C'] || r['optionC'] || '').trim();
          const optD = String(r['Phương án D'] || r['D'] || r['optionD'] || '').trim();
          const rawCorrect = String(r['Đáp án đúng'] || r['correctOption'] || r['Đáp án'] || 'A').trim();
          const timeLimit = Number(r['Thời gian (giây)'] || r['Thời gian'] || 40) || 40;
          const videoUrl = String(r['Link Video'] || r['videoUrl'] || '').trim();
          const explanation = String(r['Giải thích'] || r['explanation'] || '').trim();

          // Resolve correctOption to the option text if given as 'A', 'B', 'C', 'D'
          let correctOption = rawCorrect;
          if (rawCorrect.toUpperCase() === 'A' && optA) correctOption = optA;
          else if (rawCorrect.toUpperCase() === 'B' && optB) correctOption = optB;
          else if (rawCorrect.toUpperCase() === 'C' && optC) correctOption = optC;
          else if (rawCorrect.toUpperCase() === 'D' && optD) correctOption = optD;

          return {
            id: Date.now() + idx,
            sessionId: session?.id || 1,
            questionOrder: order,
            title: title || `Câu hỏi số ${order}`,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctOption: correctOption || optA,
            timeLimitSeconds: timeLimit,
            videoUrl: videoUrl,
            videoType: videoUrl ? 'YOUTUBE' : 'NONE',
            explanation: explanation,
          };
        });

        setSetupQuestions(parsedQuestions);
        toast.success(`Đã nạp ${parsedQuestions.length} câu hỏi từ file Excel. Vui lòng bấm "Lưu danh sách câu hỏi" để cập nhật!`);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi đọc file Excel. Vui lòng kiểm tra đúng định dạng mẫu!');
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddQuestion = () => {
    const nextOrder = setupQuestions.length + 1;
    const newQ = {
      id: Date.now(),
      sessionId: session?.id || 1,
      questionOrder: nextOrder,
      title: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: '',
      timeLimitSeconds: 40,
      videoUrl: '',
      videoType: 'NONE',
      explanation: '',
    };
    setSetupQuestions([...setupQuestions, newQ]);
    toast.info(`Đã thêm Câu hỏi số ${nextOrder}. Hãy điền nội dung và bấm Lưu.`);
  };

  const handleDeleteQuestion = (idx: number) => {
    const target = setupQuestions[idx];
    setConfirmDialog({
      title: 'Xóa câu hỏi',
      message: `Xác nhận xóa Câu hỏi số ${target.questionOrder || idx + 1}?`,
      confirmText: 'Xóa câu hỏi',
      confirmType: 'danger',
      onConfirm: () => {
        const updated = setupQuestions
          .filter((_, i) => i !== idx)
          .map((q, i) => ({
            ...q,
            questionOrder: i + 1,
          }));
        setSetupQuestions(updated);
        toast.success('Đã xóa câu hỏi khỏi danh sách!');
      },
    });
  };

  const handleSaveQuestions = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      const saved = await adminLiveApi.saveQuestions(session.id, setupQuestions);
      setSetupQuestions(saved);
      await fetchSession();
      toast.success('Đã lưu 10 câu hỏi Vòng 1 thành công!');
    } catch (err) {
      toast.error('Lỗi lưu câu hỏi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveR2Topics = async () => {
    if (!session) return;
    try {
      setActionLoading(true);
      const saved = await adminLiveApi.saveRound2Topics(session.id, setupR2Topics);
      setSetupR2Topics(saved);
      setRound2Topics(saved);
      await fetchSession();
      toast.success('Đã lưu đề thi Vòng 2 thành công!');
    } catch (err) {
      toast.error('Lỗi lưu đề thi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishConfigAndStartLive = () => {
    if (!session) return;
    const missingPlayersCount = Math.max(0, 10 - setupPlayers.length);
    const missingQuestionsCount = Math.max(0, 10 - setupQuestions.length);

    let warningText = '';
    if (missingPlayersCount > 0) {
      warningText += `Danh sách thí sinh hiện chỉ có ${setupPlayers.length}/10 thí sinh. `;
    }
    if (missingQuestionsCount > 0) {
      warningText += `Vòng 1 hiện chỉ có ${setupQuestions.length}/10 câu hỏi. `;
    }

    setConfirmDialog({
      title: 'Hoàn tất cấu hình & Bắt đầu Vòng Chung kết',
      message: `${warningText ? warningText + ' ' : ''}Xác nhận hoàn tất cấu hình và mở phòng chờ thi đấu? Hệ thống sẽ chuyển ngay sang Bàn điều hành Sân khấu.`,
      confirmText: 'Bắt đầu Vòng Chung kết',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          // Tự động lưu thí sinh nếu có
          if (setupPlayers.length > 0) {
            await adminLiveApi.savePlayers(session.id, setupPlayers);
          }
          // Tự động lưu câu hỏi nếu có
          if (setupQuestions.length > 0) {
            await adminLiveApi.saveQuestions(session.id, setupQuestions);
          }
          // Đặt trạng thái LOBBY để bắt đầu điểm danh
          await adminLiveApi.setRound(session.id, 1, 'LOBBY');
          toast.success('Đã hoàn tất cấu hình! Mở phòng chờ Vòng Chung kết thành công.');
          navigate('/admin/chung-ket');
        } catch (err: any) {
          toast.error('Lỗi khởi động Vòng Chung kết: ' + (err.response?.data?.message || err.message));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleResetSession = () => {
    setConfirmDialog({
      title: 'Làm sạch dữ liệu thi thử',
      message: 'Xác nhận xóa sạch toàn bộ lịch sử trả lời, điểm số của các thí sinh? Phiên thi sẽ được đưa về Sảnh chờ ban đầu để sẵn sàng chạy lại.',
      confirmText: 'Làm sạch & Bắt đầu lại',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const active = await liveApi.getActiveSession().catch(() => null);
          const targetId = active?.id || session?.id;
          await adminLiveApi.resetSession(targetId);
          toast.success('Đã làm sạch toàn bộ dữ liệu thi thử thành công!');
          await fetchSession();
        } catch (err: any) {
          const errMsg = err?.response?.data?.message || err?.message || 'Lỗi khi làm sạch dữ liệu thi';
          toast.error(errMsg);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const round1State = session?.round1State || 'IDLE';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="live-config" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Header Chuẩn Quản Trị */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cấu hình Vòng Chung kết
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Pre-Contest Setup
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập danh sách 10 thí sinh, câu hỏi Vòng 1 và đề thi Vòng 2 trước khi bước vào phòng thi chính thức.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetSession}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs transition-colors"
            title="Làm sạch toàn bộ điểm số và kết quả thi thử"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            Làm sạch dữ liệu test
          </button>

          <button
            onClick={fetchSession}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={handleFinishConfigAndStartLive}
            disabled={actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            title="Lưu toàn bộ cấu hình và mở phòng chờ sân khấu cho MC điều hành"
          >
            <Trophy className="w-4 h-4 fill-white" />
            <span>HOÀN TẤT & MỞ PHÒNG CHỜ</span>
          </button>
        </div>
      </div>

      {/* Main Cockpit Body */}
      <div className="w-full space-y-6">
        {/* ========================================================= */}
        {/* TAB 0: CẤU HÌNH PRE-CONTEST (THÍ SINH, CÂU HỎI, ĐỀ THI) */}
        {/* ========================================================= */}
        {activeTab === 'setup' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Sub-tab selection */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSetupSubTab('players')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    setupSubTab === 'players'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4" /> 10 Thí sinh Chung kết
                </button>
                <button
                  onClick={() => setSetupSubTab('questions')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    setupSubTab === 'questions'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Star className="w-4 h-4" /> 10 Câu hỏi Vòng 1
                </button>
                <button
                  onClick={() => setSetupSubTab('r2topics')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    setupSubTab === 'r2topics'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Zap className="w-4 h-4" /> Đề thi Vòng 2 (Nghiệp vụ)
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Lưu cấu hình trực tiếp vào cơ sở dữ liệu để bảo đảm tuyệt đối tính chính xác trước giờ thi.
              </div>
            </div>

            {/* Sub-tab 1: Players */}
            {setupSubTab === 'players' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        DANH SÁCH THÍ SINH VÒNG CHUNG KẾT
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {setupPlayers.length} thí sinh
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Quản lý 10 thí sinh: thêm, sửa, xóa, nhập thông tin và ảnh đại diện. Bấm "Lưu danh sách thí sinh" để lưu vào cơ sở dữ liệu.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={openAddPlayerModal}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" /> Thêm thí sinh
                    </button>
                    <button
                      onClick={handleImportTop10}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Shuffle className="w-4 h-4" /> Lấy nhanh Top 10 từ Vòng loại
                    </button>
                    <button
                      onClick={handleSavePlayers}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Save className="w-4 h-4" /> Lưu danh sách thí sinh
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên, đơn vị, SBD, SĐT..."
                      value={playerSearchTerm}
                      onChange={(e) => setPlayerSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  {setupPlayers.length > 0 && (
                    <div className="text-xs text-slate-500">
                      * Nhớ nhấn <strong className="text-emerald-600">Lưu danh sách thí sinh</strong> sau khi thêm, sửa hoặc xóa.
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-16 text-center">SBD</th>
                          <th className="p-3">Họ và tên & Chức vụ</th>
                          <th className="p-3">Đơn vị</th>
                          <th className="p-3">Email nhận OTP</th>
                          <th className="p-3">Số điện thoại</th>
                          <th className="p-3 text-center w-20">Ảnh</th>
                          <th className="p-3 text-center w-28">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-700">
                        {filteredSetupPlayers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-14 text-center text-slate-500">
                              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                              <p className="font-bold text-slate-600">Chưa có thí sinh nào trong danh sách</p>
                              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                Nhấn <strong>"Lấy nhanh Top 10 từ Vòng loại"</strong> để tải dữ liệu thí sinh đạt chuẩn hoặc <strong>"Thêm thí sinh"</strong> để nhập mới.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredSetupPlayers.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-slate-200/40 transition-colors">
                              <td className="p-3 text-center font-black text-amber-600">
                                SBD {String(p.orderNumber || idx + 1).padStart(2, '0')}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 text-sm">{p.fullName}</div>
                              </td>
                              <td className="p-3 font-semibold text-slate-600">
                                {p.unit}
                              </td>
                              <td className="p-3 font-mono text-amber-700 text-xs">
                                {p.email || '—'}
                              </td>
                              <td className="p-3 font-mono text-slate-600 text-xs">
                                {p.phone || '—'}
                              </td>
                              <td className="p-3 text-center">
                                {p.avatarUrl ? (
                                  <img
                                    src={p.avatarUrl}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-cover mx-auto border border-slate-300"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-500 text-xs mx-auto">
                                    {p.fullName?.charAt(0) || '?'}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openEditPlayerModal(setupPlayers.indexOf(p))}
                                    className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all"
                                    title="Sửa thông tin"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlayer(setupPlayers.indexOf(p))}
                                    className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition-all"
                                    title="Xóa thí sinh"
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
                </div>
              </div>
            )}

            {/* Sub-tab 2: Questions */}
            {setupSubTab === 'questions' && (
              <div className="space-y-4">
                {/* Hidden Excel Input */}
                <input
                  type="file"
                  ref={excelInputRef}
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleImportQuestionsExcel}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl gap-3 shadow-xs">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      BỘ CÂU HỎI VÒNG 1 ({setupQuestions.length} CÂU)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thời gian mặc định 40 giây/câu. Đáp án sẽ được xáo trộn ngẫu nhiên trên máy thí sinh, không phụ thuộc cố định ký tự A/B/C/D.
                    </p>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadQuestionTemplate}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                      title="Tải template mẫu Excel .xlsx"
                    >
                      <Download className="w-4 h-4 text-blue-600" /> Tải file mẫu Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => excelInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                      title="Nhập danh sách câu hỏi từ file Excel"
                    >
                      <Upload className="w-4 h-4 text-blue-600" /> Nhập từ Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-slate-950" /> Thêm câu hỏi
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuestions}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Save className="w-4 h-4" /> Lưu danh sách câu hỏi
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {setupQuestions.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Star className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Chưa có câu hỏi nào cho Vòng 1</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Bạn có thể bấm <strong>"Tải file mẫu Excel"</strong> để chuẩn bị câu hỏi, sau đó bấm <strong>"Nhập từ Excel"</strong> hoặc bấm <strong>"Thêm câu hỏi"</strong> để nhập tay trực tiếp.
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                        >
                          Thêm câu hỏi đầu tiên
                        </button>
                      </div>
                    </div>
                  ) : (
                    setupQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                              {q.questionOrder || idx + 1}
                            </span>
                            <span className="font-black text-slate-800 text-sm">
                              CÂU HỎI SỐ {q.questionOrder || idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500 font-bold">Đáp án đúng:</label>
                              <select
                                value={
                                  q.correctOption === q.optionA || q.correctOption === 'A' ? 'A' :
                                  q.correctOption === q.optionB || q.correctOption === 'B' ? 'B' :
                                  q.correctOption === q.optionC || q.correctOption === 'C' ? 'C' :
                                  q.correctOption === q.optionD || q.correctOption === 'D' ? 'D' :
                                  'A'
                                }
                                onChange={(e) => {
                                  const key = e.target.value;
                                  const selectedContent =
                                    key === 'A' ? q.optionA :
                                    key === 'B' ? q.optionB :
                                    key === 'C' ? q.optionC :
                                    q.optionD;
                                  const updated = [...setupQuestions];
                                  updated[idx] = {
                                    ...updated[idx],
                                    correctOption: selectedContent || key,
                                  };
                                  setSetupQuestions(updated);
                                }}
                                className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-emerald-800 font-bold focus:border-emerald-500 outline-none max-w-xs truncate"
                              >
                                <option value="A">
                                  Phương án A: {q.optionA ? (q.optionA.length > 25 ? q.optionA.slice(0, 25) + '...' : q.optionA) : '(Chưa nhập)'}
                                </option>
                                <option value="B">
                                  Phương án B: {q.optionB ? (q.optionB.length > 25 ? q.optionB.slice(0, 25) + '...' : q.optionB) : '(Chưa nhập)'}
                                </option>
                                <option value="C">
                                  Phương án C: {q.optionC ? (q.optionC.length > 25 ? q.optionC.slice(0, 25) + '...' : q.optionC) : '(Chưa nhập)'}
                                </option>
                                <option value="D">
                                  Phương án D: {q.optionD ? (q.optionD.length > 25 ? q.optionD.slice(0, 25) + '...' : q.optionD) : '(Chưa nhập)'}
                                </option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-600 font-bold block mb-1">Nội dung câu hỏi (*):</label>
                          <textarea
                            rows={2}
                            placeholder="Nhập nội dung câu hỏi..."
                            value={q.title}
                            onChange={(e) => {
                              const updated = [...setupQuestions];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setSetupQuestions(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-900 outline-none font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-slate-600 font-bold block mb-1">Phương án A (*):</label>
                            <input
                              type="text"
                              placeholder="Nội dung phương án A..."
                              value={q.optionA}
                              onChange={(e) => {
                                const updated = [...setupQuestions];
                                const wasCorrect = updated[idx].correctOption === updated[idx].optionA;
                                updated[idx] = {
                                  ...updated[idx],
                                  optionA: e.target.value,
                                  correctOption: wasCorrect ? e.target.value : updated[idx].correctOption,
                                };
                                setSetupQuestions(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600 font-bold block mb-1">Phương án B (*):</label>
                            <input
                              type="text"
                              placeholder="Nội dung phương án B..."
                              value={q.optionB}
                              onChange={(e) => {
                                const updated = [...setupQuestions];
                                const wasCorrect = updated[idx].correctOption === updated[idx].optionB;
                                updated[idx] = {
                                  ...updated[idx],
                                  optionB: e.target.value,
                                  correctOption: wasCorrect ? e.target.value : updated[idx].correctOption,
                                };
                                setSetupQuestions(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600 font-bold block mb-1">Phương án C (*):</label>
                            <input
                              type="text"
                              placeholder="Nội dung phương án C..."
                              value={q.optionC}
                              onChange={(e) => {
                                const updated = [...setupQuestions];
                                const wasCorrect = updated[idx].correctOption === updated[idx].optionC;
                                updated[idx] = {
                                  ...updated[idx],
                                  optionC: e.target.value,
                                  correctOption: wasCorrect ? e.target.value : updated[idx].correctOption,
                                };
                                setSetupQuestions(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600 font-bold block mb-1">Phương án D (*):</label>
                            <input
                              type="text"
                              placeholder="Nội dung phương án D..."
                              value={q.optionD}
                              onChange={(e) => {
                                const updated = [...setupQuestions];
                                const wasCorrect = updated[idx].correctOption === updated[idx].optionD;
                                updated[idx] = {
                                  ...updated[idx],
                                  optionD: e.target.value,
                                  correctOption: wasCorrect ? e.target.value : updated[idx].correctOption,
                                };
                                setSetupQuestions(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[11px] text-slate-500 font-semibold block mb-1">Link Video Clip minh họa (nếu có):</label>
                            <input
                              type="text"
                              placeholder="URL YouTube hoặc link video mp4..."
                              value={q.videoUrl || ''}
                              onChange={(e) => {
                                const updated = [...setupQuestions];
                                updated[idx] = { ...updated[idx], videoUrl: e.target.value, videoType: e.target.value ? 'YOUTUBE' : 'NONE' };
                                setSetupQuestions(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-600 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 font-semibold block mb-1">Giải thích đáp án & Căn cứ:</label>
                            <input
                              type="text"
                              placeholder="Căn cứ điều lệ, nghị quyết..."
                              value={q.explanation || ''}
                              onChange={(e) => {
                                const updated = [...setupQuestions];
                                updated[idx] = { ...updated[idx], explanation: e.target.value };
                                setSetupQuestions(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-600 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 3: Round 2 Topics */}
            {setupSubTab === 'r2topics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      NGÂN HÀNG ĐỀ THI VÒNG 2: NHẠY BÉN (NGHIỆP VỤ PHẦN MỀM)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mỗi mã đề gồm 02 tình huống thao tác trên phần mềm Quản lý đoàn viên (mỗi tình huống tối đa 20 điểm).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newCode = `ĐỀ ${String(setupR2Topics.length + 1).padStart(2, '0')}`;
                        setSetupR2Topics([
                          ...setupR2Topics,
                          {
                            id: Date.now(),
                            sessionId: session?.id || 1,
                            code: newCode,
                            scenario1: 'Tình huống 1 (20 điểm): Thao tác tiếp nhận đoàn viên...',
                            scenario2: 'Tình huống 2 (20 điểm): Thao tác tạo lập đợt đánh giá xếp loại...',
                            maxScore1: 20,
                            maxScore2: 20,
                          }
                        ]);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs shadow transition-all"
                    >
                      + Thêm mã đề
                    </button>
                    <button
                      onClick={handleSaveR2Topics}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Save className="w-4 h-4" /> Lưu đề thi Vòng 2
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {setupR2Topics.map((t, idx) => (
                    <div key={t.id || idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-black text-amber-600 text-sm">
                          MÃ ĐỀ: {t.code}
                        </span>
                        <input
                          type="text"
                          value={t.code}
                          onChange={(e) => {
                            const updated = [...setupR2Topics];
                            updated[idx] = { ...updated[idx], code: e.target.value };
                            setSetupR2Topics(updated);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-bold text-center w-24"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 font-semibold block mb-1">Tình huống 1 (tối đa 20 điểm):</label>
                        <textarea
                          rows={3}
                          value={t.scenario1}
                          onChange={(e) => {
                            const updated = [...setupR2Topics];
                            updated[idx] = { ...updated[idx], scenario1: e.target.value };
                            setSetupR2Topics(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 font-semibold block mb-1">Tình huống 2 (tối đa 20 điểm):</label>
                        <textarea
                          rows={3}
                          value={t.scenario2}
                          onChange={(e) => {
                            const updated = [...setupR2Topics];
                            updated[idx] = { ...updated[idx], scenario2: e.target.value };
                            setSetupR2Topics(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
      {/* Modal Thêm / Sửa Thí sinh */}
      {playerModalOpen && (
        <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {editingPlayerIndex !== null ? 'CHỈNH SỬA THÔNG TIN THÍ SINH' : 'THÊM MỚI THÍ SINH VÒNG CHUNG KẾT'}
              </h3>
              <button
                onClick={() => setPlayerModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Số báo danh (SBD):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerFormData.orderNumber}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, orderNumber: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-black text-amber-600 text-center"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500 font-bold block mb-1">Họ và tên thí sinh (*):</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A..."
                    value={playerFormData.fullName}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Đơn vị trực thuộc (*):</label>
                <input
                  type="text"
                  placeholder="Huyện đoàn ..., Thị đoàn ..., Đoàn Khối..."
                  value={playerFormData.unit}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Email nhận mã OTP (*):</label>
                  <input
                    type="email"
                    required
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
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setPlayerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSavePlayerForm}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow active:scale-95"
              >
                {editingPlayerIndex !== null ? 'Cập nhật thí sinh' : 'Thêm vào danh sách'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Chuẩn Hệ thống */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 animate-scaleUp">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmDialog.confirmType === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  fn();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow transition-all active:scale-95 ${
                  confirmDialog.confirmType === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {confirmDialog.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </main>
    </div>
  );
}
