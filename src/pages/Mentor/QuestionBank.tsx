import { useEffect, useRef, useState } from "react";
import {
    Swords, Star, Trash2, Plus, FileSpreadsheet, AlertTriangle,
    CheckCircle2, Loader2, Library, Upload,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyCallApi from "../../api/partyCallApi";
import type { ChallengeMode, ImportBankResultDto, LiveChallengeBankItemDto } from "../../types/partyCall.types";

const MODES: ChallengeMode[] = ["SELF_SCORE", "ATTACK"];

// ── SHARED ATOMS ──────────────────────────────────────────────────────────────
const eyebrow = "block text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] mb-1.5";
const inputCls = [
    "w-full px-3.5 py-2.5 rounded-sky-chip border border-white/80 bg-white/60",
    "text-sm font-medium text-sky-ink transition",
    "focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18",
    "placeholder:text-sky-ink-3 placeholder:font-normal",
].join(" ");

// Mode is a taxonomy, not a verdict: Attack is warm because it costs someone
// points; Self-score is the cool default. Neither borrows success/danger hues.
const MODE_CFG: Record<ChallengeMode, { icon: typeof Swords; label: string; cls: string }> = {
    ATTACK: { icon: Swords, label: "Attack", cls: "text-sky-peach-deep" },
    SELF_SCORE: { icon: Star, label: "Self-score", cls: "text-sky-deep" },
};

export default function QuestionBank() {
    const [items, setItems] = useState<LiveChallengeBankItemDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [promptText, setPromptText] = useState("");
    const [mode, setMode] = useState<ChallengeMode>("SELF_SCORE");
    const [points, setPoints] = useState(10);
    const [saving, setSaving] = useState(false);

    const [importResult, setImportResult] = useState<ImportBankResultDto | null>(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = () => {
        setLoading(true);
        partyCallApi
            .getBankItems()
            .then((r) => {
                if (r.success) setItems(r.data ?? []);
                else setError(r.message || "Could not load the question bank");
            })
            .catch((e) => setError(e?.response?.data?.message || "Failed to load the question bank"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleAdd = async () => {
        if (!promptText.trim() || points <= 0) return;
        setSaving(true);
        setError(null);
        try {
            const r = await partyCallApi.addBankItem(promptText.trim(), mode, points);
            if (r.success) {
                setPromptText("");
                setPoints(10);
                load();
            } else {
                setError(r.message || "Could not add the item");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "Unexpected error");
        } finally {
            setSaving(false);
        }
    };

    const handleImport = async (file: File) => {
        setImporting(true);
        setImportResult(null);
        setError(null);
        try {
            const r = await partyCallApi.importBankItems(file);
            if (r.success) {
                setImportResult(r.data ?? null);
                load();
            } else {
                setError(r.message || "Import failed");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "Import failed");
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await partyCallApi.deleteBankItem(id);
            load();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Could not delete");
        }
    };

    return (
        <>
            <PageMeta title="Question Bank — HabitEvolve" description="Prepare Live Challenge Arena prompts ahead of time" />
            <PageBreadcrumb pageTitle="Question Bank" />

            {error && (
                <div className="relative overflow-hidden sky-glass mb-6 rounded-sky-card pl-5 pr-4 py-4">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                    <p className="relative flex items-center gap-2.5 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Add manually */}
                <div className="sky-glass rounded-sky-card p-6">
                    <div className="relative flex items-center gap-2.5 mb-4">
                        <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-violet/14 text-sky-violet-deep shrink-0">
                            <Plus className="w-4 h-4" />
                        </span>
                        <h2 className="font-display text-base font-semibold text-sky-ink tracking-[-0.01em]">Add a challenge</h2>
                    </div>
                    <div className="relative space-y-3.5">
                        <div>
                            <label className={eyebrow}>Prompt</label>
                            <input
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="e.g. Do 10 push-ups right now!"
                                className={inputCls}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className={eyebrow}>Mode</label>
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value as ChallengeMode)}
                                    className={inputCls}
                                >
                                    {MODES.map((m) => (
                                        <option key={m} value={m}>{m === "SELF_SCORE" ? "Self-score (+points)" : "Attack (−points to a rival)"}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-28">
                                <label className={eyebrow}>Points</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={points}
                                    onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                                    className={`${inputCls} tabular-nums`}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={saving || !promptText.trim() || points <= 0}
                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-sky-chip font-semibold text-sm text-white bg-linear-to-b from-sky-violet to-sky-violet-deep shadow-[0_6px_16px_rgba(36,52,77,0.24)] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(36,52,77,0.28)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {saving ? "Adding…" : "Add to bank"}
                        </button>
                    </div>
                </div>

                {/* Import Excel */}
                <div className="sky-glass rounded-sky-card p-6 flex flex-col">
                    <div className="relative flex items-center gap-2.5 mb-2">
                        <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-deep/12 text-sky-deep shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                        </span>
                        <h2 className="font-display text-base font-semibold text-sky-ink tracking-[-0.01em]">Import from Excel</h2>
                    </div>
                    <p className="relative text-sm font-medium text-sky-ink-2 mb-4 leading-relaxed">
                        .xlsx with columns{" "}
                        <code className="px-1.5 py-0.5 rounded-sky-chip bg-sky-ink/7 text-sky-ink text-xs font-mono">PromptText</code> |{" "}
                        <code className="px-1.5 py-0.5 rounded-sky-chip bg-sky-ink/7 text-sky-ink text-xs font-mono">Mode</code> (SELF_SCORE / ATTACK) |{" "}
                        <code className="px-1.5 py-0.5 rounded-sky-chip bg-sky-ink/7 text-sky-ink text-xs font-mono">Points</code>
                    </p>
                    {/* The dashed well makes the drop target legible on glass; the native
                        input keeps its own file-picker behaviour untouched. */}
                    <label className="relative flex flex-col items-center gap-2 px-4 py-6 mb-3 rounded-sky-md border-2 border-dashed border-sky-deep/28 bg-white/45 cursor-pointer transition hover:bg-white/70 hover:border-sky-deep/45">
                        <span className="grid place-items-center w-10 h-10 rounded-full bg-sky-deep/10 text-sky-deep">
                            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </span>
                        <span className="text-sm font-semibold text-sky-ink">{importing ? "Importing…" : "Choose an .xlsx file"}</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx"
                            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                            disabled={importing}
                            className="sr-only"
                        />
                    </label>
                    {importResult && (
                        <div className="relative overflow-hidden rounded-sky-md border border-white/70 bg-sky-teal-bg/70 pl-4 pr-3.5 py-3">
                            {/* Teal, never green. */}
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-teal" />
                            <p className="relative flex items-center gap-2 text-sm font-semibold text-sky-teal">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                Imported <span className="tabular-nums">{importResult.imported}</span>, skipped <span className="tabular-nums">{importResult.skipped}</span>
                            </p>
                            {importResult.errors.length > 0 && (
                                <ul className="relative mt-2 pl-6 space-y-1">
                                    {importResult.errors.map((err, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-xs font-medium text-sky-peach-deep">
                                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{err}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="sky-glass rounded-sky-card p-6">
                <div className="relative flex items-center gap-2.5 mb-4">
                    <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-peach/22 text-sky-peach-deep shrink-0">
                        <Library className="w-4 h-4" />
                    </span>
                    <h2 className="font-display text-base font-semibold text-sky-ink tracking-[-0.01em]">
                        Your bank <span className="text-sky-ink-3 tabular-nums font-medium">({items.length})</span>
                    </h2>
                </div>
                {loading ? (
                    <div className="relative space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse h-14 rounded-sky-md bg-sky-ink/6" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="relative flex flex-col items-center gap-2.5 py-10">
                        <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-violet/10 text-sky-violet-deep">
                            <Library className="w-6 h-6" />
                        </span>
                        <p className="font-display text-sm font-semibold text-sky-ink">No challenges yet</p>
                        <p className="text-sm font-medium text-sky-ink-3">Add one above or import an Excel file.</p>
                    </div>
                ) : (
                    <div className="relative space-y-2">
                        {items.map((item) => {
                            const cfg = MODE_CFG[item.mode] ?? MODE_CFG.SELF_SCORE;
                            const ModeIcon = cfg.icon;
                            return (
                                <div key={item.bankItemId} className="sky-glass-chip sky-lift flex items-center justify-between gap-3 p-3.5 rounded-sky-md">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-sky-ink truncate">{item.promptText}</p>
                                        <p className="flex items-center gap-1.5 text-xs font-medium text-sky-ink-3 mt-0.5">
                                            <span className={`inline-flex items-center gap-1 font-semibold ${cfg.cls}`}>
                                                <ModeIcon className="w-3 h-3 shrink-0" />{cfg.label}
                                            </span>
                                            · <span className="tabular-nums">{item.points}</span> pts
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.bankItemId)}
                                        title="Delete"
                                        className="inline-grid place-items-center w-8 h-8 shrink-0 rounded-sky-chip border border-sky-rose/20 bg-sky-rose/8 text-sky-rose-deep transition hover:bg-sky-rose/14 hover:-translate-y-px active:translate-y-0 active:scale-95"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
