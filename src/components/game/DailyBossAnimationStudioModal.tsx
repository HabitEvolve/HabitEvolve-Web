import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, Wand2, Trash2, X, ShieldAlert, Search } from 'lucide-react';
import { adminDailyBossApi } from '../../api/adminDailyBossApi';
import { Portal, inputCls, btnBase } from '../../pages/AdminDailyBossManagement';
import type {
  DailyBossTemplateDto,
  DailyBossAnimationFrameDto,
  SpriteSheetDetectionDto,
} from '../../types/adminDailyBoss.types';
import DailyBossAnimation from './DailyBossAnimation';

interface Props {
  boss: DailyBossTemplateDto;
  /** Called after a successful upload/delete so the parent list can refresh `totalFrames`. */
  onChanged(): void;
  onClose(): void;
}

// Slicing defaults mirror the BE action signature (UploadDailyBossAnimationCommand).
const DEFAULTS = { states: 'idle,attack,hit,defeat', margin: 15, minSize: 30, rgb: 245, alpha: 10, columns: 4, rows: 4 };

export default function DailyBossAnimationStudioModal({ boss, onChanged, onClose }: Props) {
  const [frames, setFrames] = useState<DailyBossAnimationFrameDto[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<'auto' | 'grid'>('auto');
  const [statesInput, setStatesInput] = useState(DEFAULTS.states);
  const [margin, setMargin] = useState(DEFAULTS.margin);
  const [minSize, setMinSize] = useState(DEFAULTS.minSize);
  const [rgb, setRgb] = useState(DEFAULTS.rgb);
  const [alpha, setAlpha] = useState(DEFAULTS.alpha);
  const [columns, setColumns] = useState(DEFAULTS.columns);
  const [rows, setRows] = useState(DEFAULTS.rows);

  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<SpriteSheetDetectionDto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoadingFrames(true);
    try {
      const res = await adminDailyBossApi.getAnimation(boss.dailyBossTemplateId);
      if (res.success) setFrames(res.data ?? []);
    } finally {
      setLoadingFrames(false);
    }
  };

  useEffect(() => { load(); }, [boss.dailyBossTemplateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePickFile = (f: File | null) => {
    setFile(f);
    setDetection(null);
    setError('');
  };

  const handleDetect = async () => {
    if (!file) { setError('Chọn sprite sheet trước.'); return; }
    setDetecting(true); setError('');
    try {
      const res = await adminDailyBossApi.detectAnimation(file, { minSize, rgb, alpha });
      if (res.success && res.data) setDetection(res.data);
      else setError(res.message ?? 'Dò thất bại.');
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Dò thất bại.');
    } finally {
      setDetecting(false);
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('Chọn sprite sheet trước.'); return; }
    setUploading(true); setError('');
    try {
      const res = await adminDailyBossApi.uploadAnimation(boss.dailyBossTemplateId, file, {
        states: statesInput.trim() || undefined,
        auto: mode === 'auto',
        margin, minSize, rgb, alpha,
        columns: mode === 'grid' ? columns : undefined,
        rows: mode === 'grid' ? rows : undefined,
      });
      if (res.success) {
        setFrames(res.data ?? []);
        setFile(null);
        setDetection(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onChanged();
      } else {
        setError(res.message ?? 'Upload thất bại.');
      }
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Upload thất bại — kiểm tra lại số nhãn state có khớp số dòng ảnh không.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await adminDailyBossApi.deleteAnimation(boss.dailyBossTemplateId);
      if (res.success) {
        setFrames([]);
        setConfirmingDelete(false);
        onChanged();
      } else {
        setError(res.message ?? 'Xoá thất bại.');
      }
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Xoá thất bại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-2xl my-4">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-orange-100 dark:bg-orange-900/30 rounded-t-3xl">
            <div className="flex items-center gap-2 min-w-0">
              <Wand2 className="w-5 h-5 shrink-0" />
              <h2 className="font-black text-lg text-gray-900 dark:text-gray-100 truncate">
                Animation Studio — {boss.name}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-lg shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {error && (
              <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{error}</p>
            )}

            {/* ── PREVIEW ── */}
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Preview hiện tại</p>
              {loadingFrames ? (
                <div className="flex items-center justify-center h-64 border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <DailyBossAnimation frames={frames} />
                  {frames.length > 0 && (
                    confirmingDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-600">Xoá toàn bộ animation này?</span>
                        <button onClick={handleDelete} disabled={deleting} className={`${btnBase} py-1.5 px-3 bg-red-400 text-white`}>
                          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Xác nhận
                        </button>
                        <button onClick={() => setConfirmingDelete(false)} className={`${btnBase} py-1.5 px-3 bg-white dark:bg-gray-700`}>Huỷ</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmingDelete(true)} className={`${btnBase} py-1.5 px-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`}>
                        <Trash2 className="w-3.5 h-3.5" /> Xoá toàn bộ animation
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* ── UPLOAD FORM ── */}
            <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 pt-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Upload sprite sheet mới (sẽ thay thế toàn bộ frame hiện có)
              </p>

              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Sprite sheet *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
                  Tên state theo từng dòng (trên → dưới)
                </label>
                <input
                  value={statesInput}
                  onChange={(e) => setStatesInput(e.target.value)}
                  className={inputCls}
                  placeholder="idle,attack,hit,defeat"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Cách nhau bởi dấu phẩy, theo đúng thứ tự dòng trong ảnh. Có thể ghi số frame tối đa mỗi dòng: <code>idle:4,attack:6</code>. Để trống nếu để hệ thống tự đặt tên ROW_1, ROW_2…
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('auto')}
                  className={`${btnBase} py-1.5 px-3 ${mode === 'auto' ? 'bg-orange-300 dark:bg-orange-600' : 'bg-white dark:bg-gray-700'}`}
                >
                  Tự động dò (khuyên dùng)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('grid')}
                  className={`${btnBase} py-1.5 px-3 ${mode === 'grid' ? 'bg-orange-300 dark:bg-orange-600' : 'bg-white dark:bg-gray-700'}`}
                >
                  Lưới cố định (cols × rows)
                </button>
              </div>

              {mode === 'auto' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Margin</label>
                    <input type="number" min={0} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Min size</label>
                    <input type="number" min={1} value={minSize} onChange={(e) => setMinSize(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">RGB ngưỡng</label>
                    <input type="number" min={0} max={255} value={rgb} onChange={(e) => setRgb(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Alpha ngưỡng</label>
                    <input type="number" min={0} max={255} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Số cột</label>
                    <input type="number" min={1} value={columns} onChange={(e) => setColumns(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Số dòng</label>
                    <input type="number" min={1} value={rows} onChange={(e) => setRows(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {mode === 'auto' && (
                  <button type="button" onClick={handleDetect} disabled={detecting || !file} className={`${btnBase} bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200`}>
                    {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Dò thử (không lưu)
                  </button>
                )}
                <button type="button" onClick={handleUpload} disabled={uploading || !file} className={`${btnBase} bg-orange-300 dark:bg-orange-600 text-gray-900 dark:text-white ml-auto`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Cắt & Lưu
                </button>
              </div>

              {detection && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-bold text-blue-800 dark:text-blue-200">
                    <span>Ảnh: {detection.imageWidth}×{detection.imageHeight}px</span>
                    <span>Nền: {detection.backgroundMode}</span>
                    <span>Số dòng dò được: {detection.rowCount}</span>
                  </div>
                  {detection.rowCount > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase text-blue-600 dark:text-blue-300">
                            <th className="pr-3 py-1">#</th>
                            <th className="pr-3 py-1">Y0–Y1</th>
                            <th className="pr-3 py-1">Cao (px)</th>
                            <th className="pr-3 py-1">Số frame</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-200 font-medium">
                          {detection.rows.map((r) => (
                            <tr key={r.index} className="border-t border-blue-100 dark:border-blue-800">
                              <td className="pr-3 py-1">{r.index + 1}</td>
                              <td className="pr-3 py-1">{r.y0}–{r.y1}</td>
                              <td className="pr-3 py-1">{r.height}</td>
                              <td className="pr-3 py-1">{r.frameCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {detection.rowCount !== statesInput.split(',').map((s) => s.trim()).filter(Boolean).length && statesInput.trim() && (
                    <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      Số dòng dò được ({detection.rowCount}) không khớp số nhãn state ({statesInput.split(',').map((s) => s.trim()).filter(Boolean).length}) — upload thật sẽ bị từ chối, hãy chỉnh lại nhãn hoặc ngưỡng dò.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
