import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, Wand2, Trash2, X, ShieldAlert, Search, Grid3x3, Rows3 } from 'lucide-react';
import { adminDailyBossApi } from '../../api/adminDailyBossApi';
import { Portal, inputCls, btnBase } from '../../pages/AdminDailyBossManagement';
import { positiveIntDisplay, parsePositiveInt } from '../../utils/numberInput';
import SkyCard from '../ui/card/SkyCard';
import SkyButton from '../ui/button/SkyButton';
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

// Small-caps label, same recipe as the rest of the console so tracking never
// drifts between the studio and the screens that open it.
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;

export default function DailyBossAnimationStudioModal({ boss, onChanged, onClose }: Props) {
  const { t } = useTranslation();
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
    if (!file) { setError(t('admin.dailyBossManagement.studio.selectFileFirst')); return; }
    setDetecting(true); setError('');
    try {
      const res = await adminDailyBossApi.detectAnimation(file, { minSize, rgb, alpha });
      if (res.success && res.data) setDetection(res.data);
      else setError(res.message ?? t('admin.dailyBossManagement.studio.detectFailed'));
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? t('admin.dailyBossManagement.studio.detectFailed'));
    } finally {
      setDetecting(false);
    }
  };

  const handleUpload = async () => {
    if (!file) { setError(t('admin.dailyBossManagement.studio.selectFileFirst')); return; }
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
        setError(res.message ?? t('admin.dailyBossManagement.studio.uploadFailed'));
      }
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? t('admin.dailyBossManagement.studio.uploadFailedMismatch'));
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
        setError(res.message ?? t('admin.dailyBossManagement.studio.deleteFailed'));
      }
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? t('admin.dailyBossManagement.studio.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-2xl my-4">
          <div className="flex items-center justify-between p-5 border-b border-white/70 bg-sky-admin-bg-deep/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid place-items-center w-9 h-9 shrink-0 rounded-sky-chip bg-sky-violet/12 ring-1 ring-sky-violet/22 text-sky-violet-deep">
                <Wand2 className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">{t('admin.dailyBossManagement.studio.title')}</p>
                <h2 className="font-display text-lg font-semibold text-sky-ink truncate leading-tight">
                  {boss.name}
                </h2>
              </div>
            </div>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} className="shrink-0"><X className="w-5 h-5" /></SkyButton>
          </div>

          <div className="p-5 space-y-5">
            {error && (
              <p className="relative overflow-hidden flex items-start gap-2 rounded-sky-chip bg-sky-rose/10 ring-1 ring-sky-rose/24 px-3 py-2 pl-4 text-xs font-semibold text-sky-rose-deep">
                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                {error}
              </p>
            )}

            {/* ── PREVIEW ── */}
            <div>
              <p className={`${eyebrow} mb-2`}>{t('admin.dailyBossManagement.studio.previewLabel')}</p>
              {loadingFrames ? (
                <div className="flex items-center justify-center h-64 border border-dashed border-sky-ink/16 rounded-sky-card text-sky-ink-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="sr-only">{t('admin.dailyBossManagement.studio.loadingFrames')}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <DailyBossAnimation frames={frames} />
                  {frames.length > 0 && (
                    confirmingDelete ? (
                      /* The confirm strip states the stake in words and carries a
                         rose rail, so it never relies on button colour alone.
                         Safe choice sits on the right of the irreversible one. */
                      <div className="relative overflow-hidden flex flex-wrap items-center justify-center gap-2 rounded-sky-chip bg-sky-rose/9 ring-1 ring-sky-rose/24 px-3.5 py-2.5 pl-4">
                        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-rose-deep">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          {t('admin.dailyBossManagement.studio.confirmDeleteAll', { count: frames.length })}
                        </span>
                        <SkyButton type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} {t('admin.dailyBossManagement.studio.confirmBtn')}
                        </SkyButton>
                        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>{t('common.cancel')}</SkyButton>
                      </div>
                    ) : (
                      <SkyButton type="button" variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                        <Trash2 className="w-3.5 h-3.5" /> {t('admin.dailyBossManagement.studio.deleteAllBtn')}
                      </SkyButton>
                    )
                  )}
                </div>
              )}
            </div>

            {/* ── UPLOAD FORM ── */}
            <div className="border-t border-dashed border-sky-ink/16 pt-5 space-y-4">
              <p className={eyebrow}>
                {t('admin.dailyBossManagement.studio.uploadSectionHint')}
              </p>

              <div>
                <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.spriteSheetLabel')}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.dailyBossManagement.studio.stateNamesLabel')}
                </label>
                <input
                  value={statesInput}
                  onChange={(e) => setStatesInput(e.target.value)}
                  className={inputCls}
                  placeholder="idle,attack,hit,defeat"
                />
                <p className="text-[11px] text-sky-ink-3 mt-1.5 leading-relaxed">
                  {t('admin.dailyBossManagement.studio.stateNamesHintPrefix')}<code className="px-1 py-0.5 rounded bg-sky-ink/7 font-medium text-sky-ink-2">idle:4,attack:6</code>{t('admin.dailyBossManagement.studio.stateNamesHintSuffix')}
                </p>
              </div>

              {/* Segmented control: one glass track, the live half filled deep —
                  so the choice reads as a switch rather than two loose buttons. */}
              <div className="inline-flex gap-1 p-1 rounded-sky-chip bg-white/58 ring-1 ring-white/80">
                {([
                  { key: 'auto', label: t('admin.dailyBossManagement.studio.modeAutoLabel'), Icon: Wand2 },
                  { key: 'grid', label: t('admin.dailyBossManagement.studio.modeGridLabel'), Icon: Grid3x3 },
                ] as const).map(({ key, label, Icon }) => {
                  const on = mode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      aria-pressed={on}
                      className={`${btnBase} ${on
                        ? 'bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25'
                        : 'text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink'}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-white' : 'text-sky-ink-3'}`} strokeWidth={2.3} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {mode === 'auto' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.marginLabel')}</label>
                    <input type="number" min={0} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.minSizeLabel')}</label>
                    <input type="number" min={1} value={positiveIntDisplay(minSize)} onChange={(e) => setMinSize(parsePositiveInt(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.rgbThresholdLabel')}</label>
                    <input type="number" min={0} max={255} value={rgb} onChange={(e) => setRgb(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.alphaThresholdLabel')}</label>
                    <input type="number" min={0} max={255} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.columnsLabel')}</label>
                    <input type="number" min={1} value={positiveIntDisplay(columns)} onChange={(e) => setColumns(parsePositiveInt(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('admin.dailyBossManagement.studio.rowsLabel')}</label>
                    <input type="number" min={1} value={positiveIntDisplay(rows)} onChange={(e) => setRows(parsePositiveInt(e.target.value))} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {mode === 'auto' && (
                  <SkyButton type="button" variant="secondary" onClick={handleDetect} disabled={detecting || !file}>
                    {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {t('admin.dailyBossManagement.studio.detectBtn')}
                  </SkyButton>
                )}
                <SkyButton type="button" variant="primary" onClick={handleUpload} disabled={uploading || !file} className="ml-auto">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t('admin.dailyBossManagement.studio.uploadBtn')}
                </SkyButton>
              </div>

              {detection && (
                /* A dry-run report, not a verdict — so it sits on the cool
                   operational hue. Teal would claim "approved" and rose "failed";
                   neither is true of a measurement. */
                <div className="relative overflow-hidden rounded-sky-card bg-sky-deep/7 ring-1 ring-sky-deep/18 p-3.5 text-xs space-y-3">
                  <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep/45" />
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 shrink-0 text-sky-deep" strokeWidth={2.4} aria-hidden="true" />
                    <span className={eyebrow}>{t('admin.dailyBossManagement.studio.detectionResultTitle')}</span>
                  </div>
                  {/* Read-outs as discrete stat chips: each number gets its own
                      surface so the eye lands on the value, not the sentence. */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { k: t('admin.dailyBossManagement.studio.statImage'), v: `${detection.imageWidth}×${detection.imageHeight}px` },
                      { k: t('admin.dailyBossManagement.studio.statBackground'), v: detection.backgroundMode },
                      { k: t('admin.dailyBossManagement.studio.statRowCount'), v: String(detection.rowCount) },
                    ].map(({ k, v }) => (
                      <span key={k} className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-sky-chip bg-white/72 ring-1 ring-white/85">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-ink-3">{k}</span>
                        <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{v}</span>
                      </span>
                    ))}
                  </div>
                  {detection.rowCount > 0 && (
                    <div className="overflow-x-auto rounded-sky-chip bg-white/62 ring-1 ring-white/80">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.1em] text-sky-ink-3">
                            <th className="px-3 py-2 font-semibold">#</th>
                            <th className="px-3 py-2 font-semibold">Y0–Y1</th>
                            <th className="px-3 py-2 font-semibold">{t('admin.dailyBossManagement.studio.tableColHeight')}</th>
                            <th className="px-3 py-2 font-semibold">{t('admin.dailyBossManagement.studio.tableColFrameCount')}</th>
                          </tr>
                        </thead>
                        <tbody className="text-sky-ink-2 font-medium">
                          {detection.rows.map((r) => (
                            <tr key={r.index} className="border-t border-sky-ink/8">
                              <td className="px-3 py-1.5 font-display font-semibold text-sky-ink tabular-nums">{r.index + 1}</td>
                              <td className="px-3 py-1.5 tabular-nums">{r.y0}–{r.y1}</td>
                              <td className="px-3 py-1.5 tabular-nums">{r.height}</td>
                              <td className="px-3 py-1.5 tabular-nums">{r.frameCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {detection.rowCount !== statesInput.split(',').map((s) => s.trim()).filter(Boolean).length && statesInput.trim() && (
                    /* A mismatch will hard-fail the real upload, so it gets peach
                       (attention, act before you continue) rather than rose —
                       nothing has broken yet. */
                    <p className="relative overflow-hidden flex items-start gap-2 rounded-sky-chip bg-sky-peach/16 ring-1 ring-sky-peach/30 px-3 py-2 pl-4 font-semibold text-sky-peach-deep leading-relaxed">
                      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach" />
                      <Rows3 className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2.4} aria-hidden="true" />
                      <span>
                        {t('admin.dailyBossManagement.studio.mismatchWarning', {
                          detected: detection.rowCount,
                          labels: statesInput.split(',').map((s) => s.trim()).filter(Boolean).length,
                        })}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}
