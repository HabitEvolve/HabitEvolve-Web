import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyCallApi from "../../api/partyCallApi";
import type { ChallengeMode, ImportBankResultDto, LiveChallengeBankItemDto } from "../../types/partyCall.types";

const MODES: ChallengeMode[] = ["SELF_SCORE", "ATTACK"];

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
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Add manually */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                    <h2 className="text-xl font-black mb-4">Add a challenge</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Prompt</label>
                            <input
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="e.g. Do 10 push-ups right now!"
                                className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Mode</label>
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value as ChallengeMode)}
                                    className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white"
                                >
                                    {MODES.map((m) => (
                                        <option key={m} value={m}>{m === "SELF_SCORE" ? "Self-score (+points)" : "Attack (−points to a rival)"}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-28">
                                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Points</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={points}
                                    onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                                    className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={saving || !promptText.trim() || points <= 0}
                            className="w-full py-3 border-2 border-black rounded-full font-black text-sm bg-violet-500 text-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
                        >
                            {saving ? "Adding…" : "Add to bank"}
                        </button>
                    </div>
                </div>

                {/* Import Excel */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                    <h2 className="text-xl font-black mb-2">Import from Excel</h2>
                    <p className="text-sm text-gray-500 font-medium mb-4">
                        .xlsx with columns <code className="px-1 bg-gray-100 rounded">PromptText</code> | <code className="px-1 bg-gray-100 rounded">Mode</code> (SELF_SCORE / ATTACK) | <code className="px-1 bg-gray-100 rounded">Points</code>
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                        disabled={importing}
                        className="block w-full text-sm font-medium mb-3"
                    />
                    {importing && <p className="text-sm font-bold text-gray-500">Importing…</p>}
                    {importResult && (
                        <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-sm">
                            <p className="font-black text-emerald-800">
                                Imported {importResult.imported}, skipped {importResult.skipped}
                            </p>
                            {importResult.errors.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-amber-700 font-medium space-y-0.5">
                                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                <h2 className="text-xl font-black mb-4">Your bank ({items.length})</h2>
                {loading ? (
                    <p className="text-sm font-medium text-gray-400">Loading…</p>
                ) : items.length === 0 ? (
                    <p className="text-sm font-medium text-gray-400">No challenges yet — add one above or import an Excel file.</p>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div key={item.bankItemId} className="flex items-center justify-between gap-3 p-3 border-2 border-black rounded-xl">
                                <div className="min-w-0">
                                    <p className="font-bold truncate">{item.promptText}</p>
                                    <p className="text-xs text-gray-500">
                                        <span className={`font-black ${item.mode === "ATTACK" ? "text-red-600" : "text-emerald-600"}`}>
                                            {item.mode === "ATTACK" ? "⚔️ Attack" : "⭐ Self-score"}
                                        </span>{" "}· {item.points} pts
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.bankItemId)}
                                    className="shrink-0 px-3 py-1.5 border-2 border-black rounded-full text-xs font-black bg-red-100 hover:bg-red-200 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
