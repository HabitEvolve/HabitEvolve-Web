import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, Link } from "react-router";
import {
    Mic, MicOff, Video, VideoOff, Swords, Star, AlertTriangle, Radio,
    Trophy, Check, X, PhoneOff, Send, Loader2, VideoIcon,
    ShieldAlert, ShieldQuestion, History, Camera, CameraOff,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyCallApi from "../../api/partyCallApi";
import partyMentorApi from "../../api/mentorPartyApi";
import { useLiveCall } from "../../context/LiveCallContext";
import { AiEvidenceBadge } from "../../components/mentor/AiEvidenceBadge";
import type { PartyItem } from "../../types/api.types";
import type { ChallengeMode } from "../../types/partyCall.types";
import type { PartyWorkspaceContext } from "./PartyWorkspace/PartyWorkspace";
import { positiveIntDisplay, parsePositiveInt } from "../../utils/numberInput";

// ── SHARED ATOMS ──────────────────────────────────────────────────────────────
const eyebrow = "block text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] mb-1.5";
const inputCls = [
    "w-full px-3.5 py-2.5 rounded-sky-chip border border-white/80 bg-white/60",
    "text-sm font-medium text-sky-ink transition",
    "focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18",
    "placeholder:text-sky-ink-3 placeholder:font-normal",
].join(" ");

function VideoTile({ stream, label, muted = false, recording = false }: { stream: MediaStream | null; label: string; muted?: boolean; recording?: boolean }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    return (
        // Video needs a dark bed to read against, but it's navy ink rather than
        // pure black so it sits in the same family as every other surface.
        <div className="relative bg-sky-ink rounded-sky-md overflow-hidden ring-1 ring-white/60 shadow-[0_6px_18px_rgba(36,52,77,0.20)] aspect-video">
            {stream ? (
                <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-white/55">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[11px] font-medium">Connecting…</span>
                </div>
            )}
            {recording && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-rose/90 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-[10px] font-bold tracking-wide">REC</span>
                </span>
            )}
            <span className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-sky-ink/80 to-transparent pointer-events-none" />
            <span className="absolute bottom-1.5 left-2 text-white text-[11px] font-semibold drop-shadow-[0_1px_2px_rgba(36,52,77,0.9)]">{label}</span>
        </div>
    );
}

export default function LiveChallengeSession() {
    // When rendered as a tab inside a party's workspace (`/mentor/parties/:partyId/live-arena`),
    // the party is already scoped by the route — skip the standalone party picker.
    const workspace = useOutletContext<PartyWorkspaceContext | undefined>();

    // Session + WebRTC mesh live in a context mounted at MentorLayout, so they survive
    // switching workspace tabs or navigating to another mentor page entirely — only an
    // explicit "End session" (or closing the browser tab) actually stops the call.
    const {
        session, starting, ending, error, setError, mesh,
        recordingChallengeIds, uploadingEvidenceChallengeIds,
        startSession, endSession, refreshSession, resumeActiveSession,
    } = useLiveCall();

    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">(workspace?.partyId ?? "");

    const [adHocPrompt, setAdHocPrompt] = useState("");
    const [mode, setMode] = useState<ChallengeMode>("SELF_SCORE");
    const [points, setPoints] = useState(10);
    const [assignedToUserId, setAssignedToUserId] = useState<number | "">("");
    const [rivalUserId, setRivalUserId] = useState<number | "">("");
    const [sending, setSending] = useState(false);
    const [judgingId, setJudgingId] = useState<number | null>(null);

    // Approve-without-evidence override — challenge id currently being justified, if any.
    const [overrideChallengeId, setOverrideChallengeId] = useState<number | null>(null);
    const [overrideReason, setOverrideReason] = useState("");

    useEffect(() => {
        if (!workspace) {
            partyMentorApi.getMentorParties().then((r) => {
                if (r.success) setParties(r.data ?? []);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedPartyName = workspace?.party.name ?? parties.find((p) => p.partyId === selectedPartyId)?.name ?? "";

    // Reconnect/resume an already-active session when a party is picked — a no-op if the
    // context already has a live session tracked (e.g. one running for another party).
    useEffect(() => {
        if (!selectedPartyId) return;
        resumeActiveSession(selectedPartyId as number, selectedPartyName);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPartyId, selectedPartyName]);

    const isActiveHere = session?.status === "Active" && session.partyId === selectedPartyId;
    const activeElsewhere = session?.status === "Active" && session.partyId !== selectedPartyId;

    const handleStart = async () => {
        if (!selectedPartyId || activeElsewhere) return;
        await startSession(selectedPartyId as number, selectedPartyName);
    };

    const handleEnd = async () => {
        await endSession();
    };

    const handleSendChallenge = async () => {
        if (!session) return;
        if (!adHocPrompt.trim()) return;
        if (mode === "ATTACK" && rivalUserId === "") {
            setError("Pick a rival for an Attack challenge");
            return;
        }

        setSending(true);
        setError(null);
        try {
            const r = await partyCallApi.createChallenge(session.sessionId, {
                bankItemId: null,
                mode,
                promptText: adHocPrompt.trim(),
                points,
                assignedToUserId: assignedToUserId === "" ? null : (assignedToUserId as number),
                rivalUserId: mode === "ATTACK" ? (rivalUserId as number) : null,
            });
            if (r.success) {
                setAdHocPrompt("");
                await refreshSession();
            } else {
                setError(r.message || "Could not send the challenge");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "Unexpected error");
        } finally {
            setSending(false);
        }
    };

    const handleJudge = async (challengeId: number, approve: boolean, reason?: string) => {
        if (judgingId !== null) return;
        setJudgingId(challengeId);
        try {
            const r = await partyCallApi.judgeChallenge(challengeId, approve, reason);
            if (r.success) {
                setOverrideChallengeId(null);
                setOverrideReason("");
                await refreshSession();
            } else {
                setError(r.message || "Could not judge the challenge");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "Could not judge the challenge");
        } finally {
            setJudgingId(null);
        }
    };

    const handleOverrideSubmit = () => {
        if (overrideChallengeId === null || !overrideReason.trim()) return;
        void handleJudge(overrideChallengeId, true, overrideReason.trim());
    };

    // The mentor referees, they don't compete — exclude them from the scoreboard
    // (both the live leaderboard and the post-session "Final results" reuse this).
    const leaderboard = useMemo(
        () => (session
            ? session.participants.filter((p) => p.userId !== session.mentorUserId).sort((a, b) => b.score - a.score)
            : []),
        [session]
    );

    const pendingOrResponded = useMemo(
        () => (session ? session.challenges.filter((c) => c.status === "Pending" || c.status === "Started" || c.status === "Responded") : []),
        [session]
    );
    const judgedChallenges = useMemo(
        () => (session ? session.challenges.filter((c) => c.status === "Approved" || c.status === "Rejected") : []),
        [session]
    );

    const usernameFor = (userId: number | null) =>
        userId == null ? null : session?.participants.find((p) => p.userId === userId)?.username ?? `User ${userId}`;

    // Which connected peer(s) the mentor client is currently recording — record chỉ chạy trong
    // lúc challenge ở trạng thái Started (player đã bấm "Bắt đầu"), không phải ngay từ Pending
    // nữa; null assignee means "recording everyone" until someone responds.
    const recordingUserIds = useMemo(() => {
        if (!session) return new Set<number>();
        const ids = new Set<number>();
        for (const c of session.challenges) {
            if (c.status !== "Started" || !recordingChallengeIds.has(c.challengeId)) continue;
            if (c.assignedToUserId != null) ids.add(c.assignedToUserId);
            else mesh.connectedUserIds.forEach((uid) => ids.add(uid));
        }
        return ids;
    }, [session, recordingChallengeIds, mesh.connectedUserIds]);

    const historyLink = workspace ? `/mentor/parties/${workspace.partyId}/live-arena/history` : "/mentor/live-arena/history";

    return (
        <>
            <PageMeta title="Live Challenge Arena — HabitEvolve" description="Video call PvP challenge session, mentor as referee" />
            <div className="flex items-start justify-between gap-3">
                <PageBreadcrumb pageTitle="Live Challenge Arena" />
                <Link
                    to={historyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sky-chip text-xs font-semibold text-sky-ink-2 bg-white/60 border border-white/80 hover:bg-white hover:text-sky-ink transition shrink-0"
                >
                    <History className="w-3.5 h-3.5" /> Past sessions
                </Link>
            </div>

            {error && (
                <div className="relative overflow-hidden sky-glass mb-6 rounded-sky-card pl-5 pr-4 py-4">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                    <p className="relative flex items-center gap-2.5 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </p>
                </div>
            )}

            {!session || !isActiveHere ? (
                <div className="sky-glass rounded-sky-card p-6 sm:p-7 max-w-xl">
                    <div className="relative flex items-center gap-3 mb-5">
                        <span className="grid place-items-center w-11 h-11 rounded-sky-md bg-sky-violet/14 text-sky-violet-deep shrink-0">
                            <Radio className="w-5 h-5" />
                        </span>
                        <div>
                            <h2 className="font-display text-lg font-semibold text-sky-ink tracking-[-0.01em]">Start a Live Challenge Arena</h2>
                            <p className="text-xs font-medium text-sky-ink-3 mt-0.5">Video call your party and referee live challenges</p>
                        </div>
                    </div>

                    {activeElsewhere && (
                        <div className="relative overflow-hidden mb-4 rounded-sky-md border border-sky-peach/30 bg-sky-peach/12 pl-4 pr-3.5 py-3.5">
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach-deep" />
                            <p className="relative flex items-center gap-2 text-sm font-semibold text-sky-peach-deep">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                You already have a live session running elsewhere.
                            </p>
                            <p className="relative text-xs font-medium text-sky-ink-2 mt-1 pl-6">
                                End it (via the floating "LIVE" bar) before starting a new one — only one call can run at a time.
                            </p>
                        </div>
                    )}

                    {session?.status === "Ended" && session.partyId === selectedPartyId && (
                        <div className="relative overflow-hidden mb-4 rounded-sky-md border border-white/70 bg-sky-violet/8 p-4">
                            <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-violet to-sky-violet-deep" />
                            <p className="relative flex items-center gap-2 font-display text-sm font-semibold text-sky-violet-deep mb-2.5">
                                <Trophy className="w-4 h-4 shrink-0" /> Final results
                            </p>
                            <div className="relative space-y-1.5">
                                {leaderboard.map((p, i) => (
                                    <div key={p.userId} className="flex justify-between items-center gap-3 text-sm">
                                        <span className="font-medium text-sky-ink truncate">
                                            <span className="font-display font-semibold tabular-nums text-sky-ink-3 mr-1.5">#{p.finalRank ?? i + 1}</span>
                                            {p.username}
                                        </span>
                                        <span className="shrink-0 font-display font-semibold tabular-nums text-sky-ink">
                                            {p.score} pts
                                            {p.mGoldAwarded > 0 && (
                                                <span className="ml-2 text-sky-peach-deep">+{p.mGoldAwarded} M-Gold</span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {workspace ? (
                        <p className="relative mb-5 text-sm font-medium text-sky-ink-2">
                            Party: <span className="font-semibold text-sky-violet-deep">{workspace.party.name}</span>
                        </p>
                    ) : (
                        <div className="relative mb-5">
                            <label className={eyebrow}>Party</label>
                            <select
                                value={selectedPartyId}
                                onChange={(e) => setSelectedPartyId(e.target.value ? parseInt(e.target.value) : "")}
                                className={inputCls}
                            >
                                <option value="">Choose a party…</option>
                                {parties.map((p) => (
                                    <option key={p.partyId} value={p.partyId}>{p.name} ({p.memberCount} members)</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={handleStart}
                        disabled={!selectedPartyId || starting || activeElsewhere}
                        className="relative w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-sky-chip font-semibold text-sm text-white bg-linear-to-b from-sky-violet to-sky-violet-deep shadow-[0_6px_16px_rgba(36,52,77,0.24)] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(36,52,77,0.28)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                        {starting ? "Starting…" : "Start Live Challenge Arena"}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Video grid */}
                    <div className="xl:col-span-2 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="relative">
                                <VideoTile stream={mesh.localStream} label="You (Mentor)" muted />
                                <div className="absolute top-1.5 right-1.5 flex gap-1.5">
                                    {/* Muted/blind states are rose-filled AND take a slashed glyph —
                                        the icon alone carries the state if colour is missed. */}
                                    <button
                                        onClick={mesh.toggleMic}
                                        title={mesh.micEnabled ? "Mute mic" : "Unmute mic"}
                                        className={`grid place-items-center w-7 h-7 rounded-full backdrop-blur-md transition active:scale-95 ${mesh.micEnabled ? "bg-white/85 text-sky-ink hover:bg-white" : "bg-sky-rose text-white hover:bg-sky-rose-deep"}`}
                                    >
                                        {mesh.micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={mesh.toggleCamera}
                                        title={mesh.cameraEnabled ? "Turn camera off" : "Turn camera on"}
                                        className={`grid place-items-center w-7 h-7 rounded-full backdrop-blur-md transition active:scale-95 ${mesh.cameraEnabled ? "bg-white/85 text-sky-ink hover:bg-white" : "bg-sky-rose text-white hover:bg-sky-rose-deep"}`}
                                    >
                                        {mesh.cameraEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            {mesh.connectedUserIds.map((uid) => (
                                <VideoTile
                                    key={uid}
                                    stream={mesh.remoteStreams[uid] ?? null}
                                    label={usernameFor(uid) ?? `User ${uid}`}
                                    recording={recordingUserIds.has(uid)}
                                />
                            ))}
                        </div>
                        {mesh.mediaError && (
                            <p className="flex items-center gap-2 text-sm font-semibold text-sky-rose-deep">
                                <AlertTriangle className="w-4 h-4 shrink-0" />{mesh.mediaError}
                            </p>
                        )}

                        {/* Composer */}
                        <div className="sky-glass rounded-sky-card p-5 sm:p-6">
                            <div className="relative flex items-center gap-2.5 mb-4">
                                <span className="grid place-items-center w-8 h-8 rounded-sky-chip bg-sky-peach/22 text-sky-peach-deep shrink-0">
                                    <Send className="w-4 h-4" />
                                </span>
                                <h3 className="font-display text-base font-semibold text-sky-ink">Send a challenge</h3>
                            </div>

                            <div className="relative mb-3.5">
                                <label className={eyebrow}>Prompt</label>
                                <input
                                    value={adHocPrompt}
                                    onChange={(e) => setAdHocPrompt(e.target.value)}
                                    placeholder="e.g. Show me you're drinking water right now!"
                                    className={inputCls}
                                />
                            </div>
                            <div className="relative flex gap-3 mb-3.5">
                                <div className="flex-1">
                                    <label className={eyebrow}>Mode</label>
                                    <select
                                        value={mode}
                                        onChange={(e) => setMode(e.target.value as ChallengeMode)}
                                        className={inputCls}
                                    >
                                        <option value="SELF_SCORE">Self-score (+points)</option>
                                        <option value="ATTACK">Attack (−points to rival)</option>
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className={eyebrow}>Points</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={positiveIntDisplay(points)}
                                        onChange={(e) => setPoints(parsePositiveInt(e.target.value))}
                                        className={`${inputCls} tabular-nums`}
                                    />
                                </div>
                            </div>

                            <div className="relative flex gap-3 mb-4">
                                <div className="flex-1">
                                    <label className={eyebrow}>Send to</label>
                                    <select
                                        value={assignedToUserId}
                                        onChange={(e) => setAssignedToUserId(e.target.value ? parseInt(e.target.value) : "")}
                                        className={inputCls}
                                    >
                                        <option value="">Everyone in the call</option>
                                        {session.participants.map((p) => (
                                            <option key={p.userId} value={p.userId}>{p.username}</option>
                                        ))}
                                    </select>
                                </div>
                                {mode === "ATTACK" && (
                                    <div className="flex-1">
                                        <label className={eyebrow}>Rival (loses points)</label>
                                        <select
                                            value={rivalUserId}
                                            onChange={(e) => setRivalUserId(e.target.value ? parseInt(e.target.value) : "")}
                                            className={inputCls}
                                        >
                                            <option value="">Pick a rival…</option>
                                            {session.participants
                                                .filter((p) => p.userId !== assignedToUserId)
                                                .map((p) => (
                                                    <option key={p.userId} value={p.userId}>{p.username}</option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSendChallenge}
                                disabled={sending}
                                className="relative w-full inline-flex items-center justify-center gap-2 py-3 rounded-sky-chip font-semibold text-sm text-white bg-linear-to-b from-sky-peach to-sky-peach-deep shadow-[0_6px_16px_rgba(36,52,77,0.22)] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(36,52,77,0.26)] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {sending ? "Sending…" : "Send challenge"}
                            </button>
                        </div>

                        {/* Pending / responded challenges */}
                        {pendingOrResponded.length > 0 && (
                            <div className="sky-glass rounded-sky-card p-5 sm:p-6">
                                <h3 className="relative font-display text-base font-semibold text-sky-ink mb-3.5">Awaiting judgment</h3>
                                <div className="relative space-y-2.5">
                                    {pendingOrResponded.map((c) => {
                                        const blockedByEvidence = c.status === "Responded" && c.requiresEvidence && c.evidenceStatus !== "Captured";
                                        const uploading = uploadingEvidenceChallengeIds.has(c.challengeId);
                                        return (
                                            <div key={c.challengeId} className="sky-glass-chip p-3.5 rounded-sky-md space-y-2.5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-sky-ink truncate">{c.promptText}</p>
                                                        <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-sky-ink-3 mt-0.5">
                                                            {/* Attack is warm (it costs a rival points); self-score is cool. */}
                                                            {c.mode === "ATTACK" ? (
                                                                <span className="inline-flex items-center gap-1 text-sky-peach-deep font-semibold">
                                                                    <Swords className="w-3 h-3 shrink-0" />Attacking {usernameFor(c.rivalUserId)}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-sky-deep font-semibold">
                                                                    <Star className="w-3 h-3 shrink-0" />Self-score
                                                                </span>
                                                            )}
                                                            · <span className="tabular-nums">{c.points}</span> pts ·{" "}
                                                            {c.status === "Responded"
                                                                ? `${usernameFor(c.respondedByUserId)} says done${c.responseSeconds != null ? ` in ${c.responseSeconds}s` : ""}`
                                                                : c.status === "Started"
                                                                    ? `${usernameFor(c.startedByUserId) ?? "Someone"} is doing it now…`
                                                                    : "Waiting to start"}
                                                        </p>
                                                    </div>
                                                    {c.status === "Responded" && (
                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                onClick={() => handleJudge(c.challengeId, true)}
                                                                disabled={judgingId !== null || blockedByEvidence}
                                                                title={blockedByEvidence ? "Evidence hasn't been captured yet" : undefined}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-sky-teal shadow-[0_3px_10px_rgba(36,52,77,0.18)] transition hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                                                            >
                                                                {judgingId === c.challengeId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleJudge(c.challengeId, false)}
                                                                disabled={judgingId !== null}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-sky-rose-deep bg-sky-rose/14 border border-sky-rose/30 transition hover:bg-sky-rose/22 hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                                                            >
                                                                {judgingId === c.challengeId ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {c.status === "Responded" && c.requiresEvidence && (
                                                    <div className="flex items-start gap-3.5 flex-wrap">
                                                        {c.evidence ? (
                                                            <>
                                                                <video
                                                                    src={c.evidence.mediaUrl}
                                                                    poster={c.evidence.snapshotUrls[0]}
                                                                    controls
                                                                    className="w-56 h-32 rounded-lg bg-sky-ink object-cover shrink-0"
                                                                />
                                                                <div className="flex flex-col gap-1.5 min-w-0 max-w-xs">
                                                                    <AiEvidenceBadge evidence={c.evidence} />
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-ink-3">
                                                                        {c.evidence.subjectCameraOn
                                                                            ? <Camera className="w-3 h-3 shrink-0" />
                                                                            : <CameraOff className="w-3 h-3 shrink-0 text-sky-rose-deep" />}
                                                                        {c.evidence.durationSeconds}s clip
                                                                    </span>
                                                                </div>
                                                            </>
                                                        ) : uploading ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-ink-3">
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Uploading evidence…
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-peach-deep">
                                                                <ShieldQuestion className="w-3.5 h-3.5 shrink-0" /> No evidence captured
                                                            </span>
                                                        )}
                                                        {blockedByEvidence && (
                                                            <button
                                                                onClick={() => { setOverrideChallengeId(c.challengeId); setOverrideReason(""); }}
                                                                className="text-[11px] font-semibold text-sky-ink-3 underline decoration-dotted hover:text-sky-ink-2"
                                                            >
                                                                Approve without evidence…
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {judgedChallenges.length > 0 && (
                            <div className="sky-glass rounded-sky-card p-5 sm:p-6">
                                <h3 className="relative font-display text-base font-semibold text-sky-ink mb-3">History</h3>
                                <div className="relative divide-y divide-sky-ink/8">
                                    {judgedChallenges.map((c) => (
                                        <div key={c.challengeId} className="py-2 space-y-1">
                                            <div className="flex justify-between items-center gap-3">
                                                <span className="truncate text-sm font-medium text-sky-ink-2">{c.promptText}</span>
                                                <span className={`sky-badge shrink-0 ${c.status === "Approved" ? "sky-badge-success" : "sky-badge-danger"}`}>
                                                    {c.status === "Approved" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    {c.status}
                                                </span>
                                            </div>
                                            {c.judgeOverrideReason && (
                                                <p className="flex items-start gap-1.5 text-[11px] font-medium text-sky-peach-deep">
                                                    <ShieldAlert className="w-3 h-3 shrink-0 mt-px" />
                                                    Approved without evidence: “{c.judgeOverrideReason}”
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Leaderboard — the one deliberately dark panel on the page. It's the
                        scoreboard everyone in the call looks at, so it earns the contrast;
                        the fill is navy ink over violet, not black. */}
                    <div className="relative h-fit rounded-sky-card overflow-hidden bg-linear-to-b from-sky-ink to-sky-abyss text-white p-6 shadow-[0_14px_36px_rgba(36,52,77,0.34)] ring-1 ring-white/12">
                        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-violet via-sky-peach to-sky-violet" />
                        <div className="flex items-center gap-2.5 mb-4">
                            <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-white/12 text-sky-peach shrink-0">
                                <Trophy className="w-4 h-4" />
                            </span>
                            <h2 className="font-display text-lg font-semibold tracking-[-0.01em]">Leaderboard</h2>
                        </div>
                        <div className="space-y-2">
                            {leaderboard.map((p, i) => (
                                <div
                                    key={p.userId}
                                    className={`flex items-center justify-between gap-3 rounded-sky-md px-3 py-2.5 transition ${i === 0 ? "bg-white/16 ring-1 ring-sky-peach/45" : "bg-white/8"}`}
                                >
                                    <span className="flex items-center gap-2.5 min-w-0">
                                        <span className={`grid place-items-center w-6 h-6 rounded-full shrink-0 font-display text-[11px] font-semibold tabular-nums ${i === 0 ? "bg-sky-peach text-sky-ink" : "bg-white/14 text-white/70"}`}>
                                            {i + 1}
                                        </span>
                                        <span className="font-medium text-sm truncate">{p.username}</span>
                                    </span>
                                    <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-sky-peach">{p.score} pts</span>
                                </div>
                            ))}
                            {leaderboard.length === 0 && (
                                <div className="flex flex-col items-center gap-2 py-8">
                                    <span className="grid place-items-center w-11 h-11 rounded-full bg-white/10 text-white/45">
                                        <VideoIcon className="w-5 h-5" />
                                    </span>
                                    <p className="text-sm font-medium text-white/55">No one has joined yet.</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleEnd}
                            disabled={ending}
                            className="w-full mt-6 inline-flex items-center justify-center gap-2 py-3 rounded-sky-chip font-semibold text-sm text-white bg-sky-rose transition hover:bg-sky-rose-deep hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
                            {ending ? "Ending…" : "End session"}
                        </button>
                    </div>
                </div>
            )}

            {/* Approve-without-evidence override — bằng chứng bắt buộc, mentor phải giải thích tại sao vẫn duyệt. */}
            {overrideChallengeId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-ink/40 backdrop-blur-sm" onClick={() => setOverrideChallengeId(null)}>
                    <div className="sky-glass rounded-sky-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-4">
                            <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-peach/18 text-sky-peach-deep shrink-0">
                                <ShieldAlert className="w-4 h-4" />
                            </span>
                            <h3 className="font-display text-base font-semibold text-sky-ink">Approve without evidence</h3>
                        </div>
                        <p className="text-xs font-medium text-sky-ink-2 mb-3.5">
                            No clip was captured for this challenge. Explain why you're approving it anyway — this is kept on record.
                        </p>
                        <textarea
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g. I watched live, the camera froze right at the end"
                            rows={3}
                            className={`${inputCls} resize-none`}
                            autoFocus
                        />
                        <div className="flex gap-2.5 mt-4">
                            <button
                                onClick={() => setOverrideChallengeId(null)}
                                className="flex-1 py-2.5 rounded-sky-chip text-sm font-semibold text-sky-ink-2 bg-white/60 border border-white/80 hover:bg-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                disabled={!overrideReason.trim() || judgingId !== null}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-sky-chip text-sm font-semibold text-white bg-sky-peach-deep hover:-translate-y-px transition active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {judgingId === overrideChallengeId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
