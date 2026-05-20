import { useEffect, useRef, useState } from 'react';
import { adminApi } from '../../../api/admin/adminApi';
import { AdminSidebar } from './AdminDashboard';
import { Upload, Pencil, X, FileText, Video, ChevronDown, ChevronUp, Plus, Download, Filter, Trash2 } from 'lucide-react';
import { extractApiError } from '../../../hooks/useApiError';
 
interface Question {
  id: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string | null;
  optionE?: string | null;
  correctAnswer: string;
  category: string;
  isActive: boolean;
}
 
interface ScenarioQ {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string | null;
  optionE?: string | null;
  correctAnswer: string;
  displayOrder: number;
  isActive: boolean;
}
 
const ALL_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
type AnswerKey = (typeof ALL_KEYS)[number];
 
/** Return only keys that have non-empty option text in the given data map */
function getActiveKeys(data: Record<string, string>): AnswerKey[] {
  return ALL_KEYS.filter((k) => (data[`option${k}`] ?? '').trim() !== '');
}
 
// ─────────────────────────────────────────
//  Edit Modal
// ─────────────────────────────────────────
function EditModal({
  tab,
  data,
  onChange,
  onSave,
  onClose,
  saving,
  isCreate = false,
}: {
  tab: 'mc' | 'scenario';
  data: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  isCreate?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-lime-300 px-6 py-4 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {tab === 'mc' ? <FileText className="w-5 h-5 text-teal-900" /> : <Video className="w-5 h-5 text-teal-900" />}
            <h2 className="text-teal-900 font-extrabold text-base">
              {isCreate
                ? (tab === 'mc' ? 'Thêm câu hỏi Trắc nghiệm' : 'Thêm câu hỏi Tình huống')
                : (tab === 'mc' ? 'Chỉnh sửa câu hỏi Trắc nghiệm' : 'Chỉnh sửa câu hỏi Tình huống')}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-teal-800/10 hover:bg-teal-800/20 flex items-center justify-center text-teal-900 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
 
        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {tab === 'mc' ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nội dung câu hỏi</label>
                <textarea rows={3} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all resize-none" value={data.content ?? ''} onChange={(e) => onChange({ ...data, content: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {ALL_KEYS.map((k) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                      Đáp án {k}{k === 'D' || k === 'E' ? <span className="font-normal text-slate-400 normal-case"> (không bắt buộc)</span> : ''}
                    </label>
                    <input className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all" value={data[`option${k}`] ?? ''} onChange={(e) => onChange({ ...data, [`option${k}`]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Đáp án đúng</label>
                  <div className="flex gap-2">
                    {getActiveKeys(data).map((k) => (
                      <button key={k} type="button" onClick={() => onChange({ ...data, correctAnswer: k })}
                        className={`w-11 h-11 rounded-xl border-2 font-extrabold text-sm transition-all ${data.correctAnswer === k ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Danh mục</label>
                  <input className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all" value={data.category ?? ''} onChange={(e) => onChange({ ...data, category: e.target.value })} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Tiêu đề tình huống</label>
                <textarea rows={2} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all resize-none" value={data.title ?? ''} onChange={(e) => onChange({ ...data, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Mô tả (không bắt buộc)</label>
                <textarea rows={2} className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all resize-none" value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">URL Video</label>
                <input className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all" value={data.videoUrl ?? ''} onChange={(e) => onChange({ ...data, videoUrl: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {ALL_KEYS.map((k) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                      Đáp án {k}{k === 'D' || k === 'E' ? <span className="font-normal text-slate-400 normal-case"> (không bắt buộc)</span> : ''}
                    </label>
                    <input className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-0 outline-none transition-all" value={data[`option${k}`] ?? ''} onChange={(e) => onChange({ ...data, [`option${k}`]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Đáp án đúng</label>
                <div className="flex gap-2">
                  {getActiveKeys(data).map((k) => (
                    <button key={k} type="button" onClick={() => onChange({ ...data, correctAnswer: k })}
                      className={`w-11 h-11 rounded-xl border-2 font-extrabold text-sm transition-all ${data.correctAnswer === k ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
 
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Hủy</button>
          <button onClick={onSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-colors disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─── Expandable MC row ───
function MCRow({ q, idx, onEdit, onDelete, deleting }: { q: Question; idx: number; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-teal-50/20 transition-colors">
        <td className="p-3 text-slate-400 font-medium text-center">{idx + 1}</td>
        <td className="p-3 text-slate-800 font-medium">
          <button onClick={() => setExpanded((v) => !v)} className="text-left w-full flex items-start gap-1 group">
            <span className="line-clamp-2 group-hover:text-teal-700 transition-colors">{q.content}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />}
          </button>
        </td>
        <td className="p-3 text-slate-400 text-xs hidden md:table-cell">{q.category ?? '—'}</td>
        <td className="p-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs">{q.correctAnswer}</span></td>
        <td className="p-3 text-center"><button onClick={onEdit} className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center mx-auto"><Pencil className="w-4 h-4" /></button></td>
        <td className="p-3 text-center"><button onClick={onDelete} disabled={deleting} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center mx-auto disabled:opacity-40 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 border-t border-slate-100">
          <td />
          <td colSpan={4} className="px-3 pb-3 pt-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {ALL_KEYS.filter((k) => q[`option${k}` as keyof Question]).map((k) => (
                <div key={k} className={`flex items-start gap-1.5 px-3 py-2 rounded-lg border ${q.correctAnswer === k ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <span className="font-extrabold shrink-0">{k}.</span>
                  <span>{q[`option${k}` as keyof Question] as string}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
 
// ─── Expandable Scenario row ───
function ScenarioRow({ q, onEdit, onDelete, deleting }: { q: ScenarioQ; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-teal-50/20 transition-colors">
        <td className="p-3 text-slate-400 font-medium text-center">{q.displayOrder}</td>
        <td className="p-3 text-slate-800 font-medium">
          <button onClick={() => setExpanded((v) => !v)} className="text-left w-full flex items-start gap-1 group">
            <span className="line-clamp-2 group-hover:text-teal-700 transition-colors">{q.title}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />}
          </button>
        </td>
        <td className="p-3 text-slate-400 text-xs truncate max-w-[160px] hidden md:table-cell">{q.videoUrl || '—'}</td>
        <td className="p-3 text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs">{q.correctAnswer}</span></td>
        <td className="p-3 text-center"><button onClick={onEdit} className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center mx-auto"><Pencil className="w-4 h-4" /></button></td>
        <td className="p-3 text-center"><button onClick={onDelete} disabled={deleting} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center mx-auto disabled:opacity-40 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 border-t border-slate-100">
          <td />
          <td colSpan={4} className="px-3 pb-3 pt-1">
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              {ALL_KEYS.filter((k) => q[`option${k}` as keyof ScenarioQ]).map((k) => (
                <div key={k} className={`flex items-start gap-1.5 px-3 py-2 rounded-lg border ${q.correctAnswer === k ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <span className="font-extrabold shrink-0">{k}.</span>
                  <span>{q[`option${k}` as keyof ScenarioQ] as string}</span>
                </div>
              ))}
            </div>
            {q.description && <p className="text-xs text-slate-500">{q.description}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
 
export default function AdminQuestions() {
  const [tab, setTab] = useState<'mc' | 'scenario'>('mc');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categorySort, setCategorySort] = useState<'asc' | 'desc' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {
    Promise.all([
      adminApi.getAllQuestions().then((res) => setQuestions(res.data.data)),
      adminApi.getAllScenarioQuestions().then((res) => setScenarios(res.data.data)),
    ]).finally(() => setLoading(false));
  }, []);
 
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await adminApi.importQuestions(file);
      setMessage(res.data.message ?? 'Import thành công');
      const updated = await adminApi.getAllQuestions();
      setQuestions(updated.data.data);
    } catch (err) {
      setMessage(extractApiError(err, 'Import thất bại'));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
 
  const openEdit = (q: Question | ScenarioQ) => {
    setIsCreating(false);
    setEditId(q.id);
    if (tab === 'mc') {
      const mc = q as Question;
      setEditData({ content: mc.content, optionA: mc.optionA, optionB: mc.optionB, optionC: mc.optionC, optionD: mc.optionD ?? '', optionE: mc.optionE ?? '', correctAnswer: mc.correctAnswer, category: mc.category ?? '' });
    } else {
      const sc = q as ScenarioQ;
      setEditData({ title: sc.title, description: sc.description ?? '', videoUrl: sc.videoUrl, optionA: sc.optionA, optionB: sc.optionB, optionC: sc.optionC, optionD: sc.optionD ?? '', optionE: sc.optionE ?? '', correctAnswer: sc.correctAnswer });
    }
    setModalOpen(true);
  };
 
  const closeModal = () => { setModalOpen(false); setEditId(null); setEditData({}); setIsCreating(false); };
 
  const handleSave = async () => {
    if (!isCreating && !editId) return;
    setSaving(true);
    try {
      if (isCreating) {
        if (tab === 'mc') {
          await adminApi.createQuestion(editData as Record<string, unknown>);
          const updated = await adminApi.getAllQuestions();
          setQuestions(updated.data.data);
        } else {
          await adminApi.createScenarioQuestion(editData as Record<string, unknown>);
          const updated = await adminApi.getAllScenarioQuestions();
          setScenarios(updated.data.data);
        }
        setMessage('Đã thêm câu hỏi thành công');
      } else if (tab === 'mc') {
        await adminApi.updateQuestion(editId!, editData);
        const updated = await adminApi.getAllQuestions();
        setQuestions(updated.data.data);
        setMessage('Cập nhật thành công');
      } else {
        await adminApi.updateScenarioQuestion(editId!, editData);
        const updated = await adminApi.getAllScenarioQuestions();
        setScenarios(updated.data.data);
        setMessage('Cập nhật thành công');
      }
      closeModal();
    } catch (err) {
      setMessage(extractApiError(err, isCreating ? 'Thêm thất bại' : 'Cập nhật thất bại'));
    } finally {
      setSaving(false);
    }
  };
 
  const openCreate = () => {
    setIsCreating(true);
    setEditId(null);
    if (tab === 'mc') {
      setEditData({ content: '', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '', correctAnswer: 'A', category: '' });
    } else {
      setEditData({ title: '', description: '', videoUrl: '', optionA: '', optionB: '', optionC: '', optionD: '', optionE: '', correctAnswer: 'A' });
    }
    setModalOpen(true);
  };
 
  const handleDownloadTemplate = async () => {
    try {
      const res = await adminApi.downloadTemplate();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_questions.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage('Không thể tải template');
    }
  };
 
  const handleDelete = async (id: number, type: 'mc' | 'scenario') => {
    if (!window.confirm('Xác nhận xóa câu hỏi này?')) return;
    setDeletingId(id);
    try {
      if (type === 'mc') {
        await adminApi.deleteQuestion(id);
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      } else {
        await adminApi.deleteScenarioQuestion(id);
        setScenarios((prev) => prev.filter((q) => q.id !== id));
      }
      setMessage('Xóa thành công');
    } catch (err) {
      setMessage(extractApiError(err, 'Xóa thất bại'));
    } finally {
      setDeletingId(null);
    }
  };
 
  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar active="questions" />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
        </main>
      </div>
    );
  }
 
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <AdminSidebar active="questions" />
      <main className="flex-1 p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Quản lý câu hỏi</h1>
            <p className="text-sm text-slate-500 mt-1">{questions.length} câu TN · {scenarios.length} câu TH</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Tải template
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Đang import...' : 'Import Excel'}
            </button>
            {tab === 'mc' && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm câu hỏi
              </button>
            )}
            {tab === 'scenario' && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm tình huống
              </button>
            )}
          </div>
        </div>
 
        {message && (
          <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-sm text-teal-800 font-medium flex items-center justify-between">
            {message}
            <button onClick={() => setMessage('')} className="text-teal-600 hover:text-teal-800"><X className="w-4 h-4" /></button>
          </div>
        )}
 
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('mc')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'mc' ? 'bg-teal-700 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Trắc nghiệm ({questions.length})
          </button>
          <button
            onClick={() => setTab('scenario')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'scenario' ? 'bg-teal-700 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50'
            }`}
          >
            <Video className="w-4 h-4" />
            Tình huống ({scenarios.length})
          </button>
        </div>
 
        {/* MC Table */}
        {tab === 'mc' && (() => {
          const categories = [...new Set(questions.map((q) => q.category).filter(Boolean))].sort();
          const filtered = questions
            .filter((q) => !categoryFilter || q.category === categoryFilter)
            .sort((a, b) => {
              if (!categorySort) return 0;
              return categorySort === 'asc'
                ? (a.category ?? '').localeCompare(b.category ?? '', 'vi')
                : (b.category ?? '').localeCompare(a.category ?? '', 'vi');
            });
          return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Category filter toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500">Danh mục:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 focus:border-teal-500 focus:ring-0 outline-none"
              >
                <option value="">Tất cả ({questions.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c} ({questions.filter((q) => q.category === c).length})</option>
                ))}
              </select>
              <button
                onClick={() => setCategorySort((s) => s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc')}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  categorySort ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {categorySort === 'asc' ? '↑' : categorySort === 'desc' ? '↓' : '⇅'} Sắp xếp danh mục
              </button>
              {(categoryFilter || categorySort) && (
                <button onClick={() => { setCategoryFilter(''); setCategorySort(null); }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Xóa bộ lọc</button>
              )}
              <span className="ml-auto text-xs text-slate-400">{filtered.length} câu hỏi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-left w-12 text-slate-500 font-semibold">STT</th>
                    <th className="p-3 text-left text-slate-500 font-semibold">Nội dung</th>
                    <th className="p-3 text-left w-32 text-slate-500 font-semibold hidden md:table-cell">Danh mục</th>
                    <th className="p-3 text-center w-16 text-slate-500 font-semibold">Đúng</th>
                    <th className="p-3 text-center w-16 text-slate-500 font-semibold">Sửa</th>
                    <th className="p-3 text-center w-16 text-slate-500 font-semibold">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q, i) => (
                    <MCRow key={q.id} q={q} idx={i} onEdit={() => openEdit(q)} onDelete={() => handleDelete(q.id, 'mc')} deleting={deletingId === q.id} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}
 
        {/* Scenario Table */}
        {tab === 'scenario' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-lime-300 px-5 py-3">
              <span className="text-teal-900 text-sm font-bold uppercase tracking-wider">Câu hỏi tình huống</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-left w-12 text-slate-500 font-semibold">TT</th>
                    <th className="p-3 text-left text-slate-500 font-semibold">Tiêu đề</th>
                    <th className="p-3 text-left w-48 text-slate-500 font-semibold hidden md:table-cell">Video URL</th>
                    <th className="p-3 text-center w-16 text-slate-500 font-semibold">Đúng</th>
                    <th className="p-3 text-center w-16 text-slate-500 font-semibold">Sửa</th>
                    <th className="p-3 text-center w-16 text-slate-500 font-semibold">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((q) => (
                    <ScenarioRow key={q.id} q={q} onEdit={() => openEdit(q)} onDelete={() => handleDelete(q.id, 'scenario')} deleting={deletingId === q.id} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
 
      {/* Edit Modal */}
      {modalOpen && (
        <EditModal
          tab={tab}
          data={editData}
          onChange={setEditData}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          isCreate={isCreating}
        />
      )}
    </div>
  );
}