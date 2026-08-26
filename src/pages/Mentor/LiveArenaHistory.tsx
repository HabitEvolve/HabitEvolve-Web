import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import {
    Radio, Trophy, ChevronDown, ChevronRight, Loader2, AlertTriangle,
    Check, X, ShieldAlert, Camera, CameraOff, Video as VideoIcon, Clapperboard,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyCallApi from "../../api/partyCallApi";
import partyMentorApi from "../../api/mentorPartyApi";
import { AiEvidenceBadge } from "../../components/mentor/AiEvidenceBadge";
import type { PartyItem } from "../../types/api.types";
import type { LiveChallengeDto, LiveChallengeSessionSummaryDto } from "../../types/partyCall.types";
import type { PartyWorkspaceContext } from "./PartyWorkspace/PartyWorkspace";

const inputCls = [
    "w-full px-3.5 py-2.5 rounded-sky-chip border border-white/80 bg-white/60",
    "text-sm font-medium text-sky-ink transition",
    "focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18",
].join(" ");

const PAGE_SIZE = 10;

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * "Đấu Trường Trực Tiếp" — audit sau buổi call. Trước đây không có cách nào lấy lại
 * session sau khi kết thúc; tab này liệt kê mọi buổi đã diễn ra của 1 party (mới → cũ)
 * và cho mentor xem lại từng challenge kèm bằng chứng, verdict AI, verdict của chính mình.
 */
export default function LiveArenaHistory() {
    const workspace = useOutletContext<PartyWorkspaceContext | undefined>();

    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">(workspace?.partyId ?? "");

    const [sessions, setSessions] = useState<LiveChallengeSessionSummaryDto[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
    const [detailByChallenge, setDetailByChallenge] = useState<Record<number, LiveChallengeDto[]>>({});
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        if (!workspace) {
            partyMentorApi.getMentorParties().then((r) => { if (r.success) setParties(r.data ?? []); });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const partyId = workspace?.partyId ?? (selectedPartyId || null);

    useEffect(() => {
        if (!partyId) { setSessions([]); return; }
        setLoading(true);
        setError(null);
        partyCallApi.getPartySessionHistory(partyId, page, PAGE_SIZE)
            .then((r) => {
                if (r.success) {
                    setSessions(r.data ?? []);
                    setTotalRecords(r.totalRecords);
                } else {
                    setError(r.message || "Could not load session history");
                }
            })
            .catch((e) => setError(e?.response?.data?.message || "Unexpected error"))
            .finally(() => setLoading(false));
    }, [partyId, page]);

    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

    const toggleExpand = async (sessionId: number) => {
        if (expandedSessionId === sessionId) { setExpandedSessionId(null); return; }
        setExpandedSessionId(sessionId);
        if (detailByChallenge[sessionId]) return;
        setDetailLoading(true);
        try {
            const r = await partyCallApi.getSessionEvidence(sessionId);
            if (r.success) setDetailByChallenge((prev) => ({ ...prev, [sessionId]: r.data ?? [] }));
        } finally {
            setDetailLoading(false);
        }
    };

    const selectedPartyName = workspace?.party.name ?? parties.find((p) => p.partyId === selectedPartyId)?.name ?? "";

    return (
        <>
            <PageMeta title="Live Arena History — HabitEvolve" description="Past Live Challenge Arena sessions — replay evidence and verdicts" />
            <PageBreadcrumb pageTitle="Live Arena History" />

            {!workspace && (
                <div className="sky-glass rounded-sky-card p-5 sm:p-6 mb-6 max-w-xl">
                    <label className="block text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] mb-1.5">Party</label>
                    <select
                        value={selectedPartyId}
                        onChange={(e) => { setSelectedPartyId(e.target.value ? parseInt(e.target.value) : ""); setPage(1); }}
                        className={inputCls}
                    >
                        <option value="">Choose a party…</option>
                        {parties.map((p) => (
                            <option key={p.partyId} value={p.partyId}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {error && (
                <div className="relative overflow-hidden sky-glass mb-6 rounded-sky-card pl-5 pr-4 py-4">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                    <p className="relative flex items-center gap-2.5 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                    </p>
                </div>
            )}

            {!partyId ? (
                <p className="text-sm font-medium text-sky-ink-3">Pick a party to see its Live Challenge Arena history.</p>
            ) : loading ? (
                <div className="flex items-center gap-2 text-sm font-medium text-sky-ink-3 py-8">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
            ) : sessions.length === 0 ? (
                <div className="sky-glass rounded-sky-card p-8 flex flex-col items-center gap-2 text-center">
                    <span className="grid place-items-center w-11 h-11 rounded-full bg-sky-violet/10 text-sky-violet-deep">
                        <Radio className="w-5 h-5" />
                    </span>
                    <p className="text-sm font-medium text-sky-ink-2">No Live Challenge Arena sessions yet for {selectedPartyName || "this party"}.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s) => (
                        <div key={s.sessionId} className="sky-glass rounded-sky-card overflow-hidden">
                            <button
                                onClick={() => toggleExpand(s.sessionId)}
                                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-white/40 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {expandedSessionId === s.sessionId ? <ChevronDown className="w-4 h-4 shrink-0 text-sky-ink-3" /> : <ChevronRight className="w-4 h-4 shrink-0 text-sky-ink-3" />}
                                    <div className="min-w-0">
                                        <p className="font-display text-sm font-semibold text-sky-ink truncate">
                                            {fmtDate(s.startedAt)}
                                            {s.status === "Active" && <span className="ml-2 sky-badge sky-badge-success">Live now</span>}
                                        </p>
                                        <p className="text-xs font-medium text-sky-ink-3 mt-0.5">
                                            {s.participantCount} participant{s.participantCount === 1 ? "" : "s"} ·{" "}
                                            {s.approvedChallengeCount}/{s.challengeCount} challenges approved
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-sky-deep bg-sky-deep/10">
                                        <Clapperboard className="w-3 h-3 shrink-0" /> {s.evidenceCapturedCount} evidence
                                    </span>
                                    {s.overrideCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-sky-peach-deep bg-sky-peach/14">
                                            <ShieldAlert className="w-3 h-3 shrink-0" /> {s.overrideCount} override{s.overrideCount === 1 ? "" : "s"}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {expandedSessionId === s.sessionId && (
                                <div className="border-t border-white/60 p-4 sm:p-5 space-y-4">
                                    {s.topParticipants.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-ink-3">
                                                <Trophy className="w-3.5 h-3.5 shrink-0" /> Top:
                                            </span>
                                            {s.topParticipants.map((p, i) => (
                                                <span key={p.userId} className="sky-badge">
                                                    #{i + 1} {p.username} · {p.score} pts
                                                    {p.mGoldAwarded > 0 && <span className="text-sky-peach-deep"> +{p.mGoldAwarded} M-Gold</span>}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {detailLoading && !detailByChallenge[s.sessionId] ? (
                                        <div className="flex items-center gap-2 text-sm font-medium text-sky-ink-3 py-4">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading challenges…
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {(detailByChallenge[s.sessionId] ?? []).map((c) => (
                                                <div key={c.challengeId} className="sky-glass-chip p-3.5 rounded-sky-md">
                                                    <div className={`flex flex-col ${c.requiresEvidence && c.evidence ? "sm:flex-row" : ""} gap-3.5`}>
                                                        {/* Video sized to watch in place — the old w-28 h-16 thumbnail
                                                            forced mentors to open the file just to see what happened. */}
                                                        {c.requiresEvidence && c.evidence && (
                                                            <video
                                                                src={c.evidence.mediaUrl}
                                                                poster={c.evidence.snapshotUrls[0]}
                                                                controls
                                                                className="w-full sm:w-64 aspect-video rounded-lg bg-sky-ink object-cover shrink-0"
                                                            />
                                                        )}

                                                        <div className="flex-1 min-w-0 space-y-2">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="font-semibold text-sm text-sky-ink truncate min-w-0">{c.promptText}</p>
                                                                {(c.status === "Approved" || c.status === "Rejected") && (
                                                                    <span className={`sky-badge shrink-0 ${c.status === "Approved" ? "sky-badge-success" : "sky-badge-danger"}`}>
                                                                        {c.status === "Approved" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                                        {c.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-medium text-sky-ink-3">
                                                                {c.mode} · {c.points} pts
                                                                {c.responseSeconds != null && ` · responded in ${c.responseSeconds}s`}
                                                            </p>

                                                            {c.requiresEvidence && (
                                                                c.evidence ? (
                                                                    <div className="space-y-1.5">
                                                                        <AiEvidenceBadge evidence={c.evidence} />
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-ink-3">
                                                                            {c.evidence.subjectCameraOn
                                                                                ? <Camera className="w-3 h-3 shrink-0" />
                                                                                : <CameraOff className="w-3 h-3 shrink-0 text-sky-rose-deep" />}
                                                                            {c.evidence.subjectUsername} · {c.evidence.durationSeconds}s
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-ink-3">
                                                                        <VideoIcon className="w-3.5 h-3.5 shrink-0" />
                                                                        {c.evidenceStatus === "NotRequired" ? "No evidence required" : `Evidence: ${c.evidenceStatus}`}
                                                                    </span>
                                                                )
                                                            )}

                                                            {c.judgeOverrideReason && (
                                                                <p className="flex items-start gap-1.5 text-[11px] font-medium text-sky-peach-deep">
                                                                    <ShieldAlert className="w-3 h-3 shrink-0 mt-px" />
                                                                    Approved without evidence: “{c.judgeOverrideReason}”
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(detailByChallenge[s.sessionId] ?? []).length === 0 && (
                                                <p className="text-xs font-medium text-sky-ink-3">No challenges were sent in this session.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold text-sky-ink-2 bg-white/60 border border-white/80 hover:bg-white transition disabled:opacity-40 disabled:pointer-events-none"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-medium text-sky-ink-3">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold text-sky-ink-2 bg-white/60 border border-white/80 hover:bg-white transition disabled:opacity-40 disabled:pointer-events-none"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
