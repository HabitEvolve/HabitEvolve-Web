import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyCallApi from "../../api/partyCallApi";
import partyMentorApi from "../../api/mentorPartyApi";
import { usePartyCallMesh } from "../../hooks/usePartyCallMesh";
import type { PartyItem } from "../../types/api.types";
import type { ChallengeMode, LiveChallengeBankItemDto, LiveChallengeSessionDto } from "../../types/partyCall.types";
import type { PartyWorkspaceContext } from "./PartyWorkspace/PartyWorkspace";

const getMentorId = () => {
    const id = localStorage.getItem("user_id");
    return id ? parseInt(id, 10) : 0;
};

function VideoTile({ stream, label, muted = false }: { stream: MediaStream | null; label: string; muted?: boolean }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    return (
        <div className="relative bg-black rounded-xl overflow-hidden border-2 border-black aspect-video">
            {stream ? (
                <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">Connecting…</div>
            )}
            <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/70 text-white text-xs font-black rounded-full">{label}</span>
        </div>
    );
}

export default function LiveChallengeSession() {
    const mentorUserId = getMentorId();
    // When rendered as a tab inside a party's workspace (`/mentor/parties/:partyId/live-arena`),
    // the party is already scoped by the route — skip the standalone party picker.
    const workspace = useOutletContext<PartyWorkspaceContext | undefined>();

    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">(workspace?.partyId ?? "");
    const [session, setSession] = useState<LiveChallengeSessionDto | null>(null);
    const [starting, setStarting] = useState(false);
    const [ending, setEnding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [bankItems, setBankItems] = useState<LiveChallengeBankItemDto[]>([]);
    const [selectedBankItemId, setSelectedBankItemId] = useState<number | "">("");
    const [adHocPrompt, setAdHocPrompt] = useState("");
    const [mode, setMode] = useState<ChallengeMode>("SELF_SCORE");
    const [points, setPoints] = useState(10);
    const [assignedToUserId, setAssignedToUserId] = useState<number | "">("");
    const [rivalUserId, setRivalUserId] = useState<number | "">("");
    const [sending, setSending] = useState(false);
    const [judgingId, setJudgingId] = useState<number | null>(null);

    useEffect(() => {
        if (!workspace) {
            partyMentorApi.getMentorParties().then((r) => {
                if (r.success) setParties(r.data ?? []);
            });
        }
        partyCallApi.getBankItems().then((r) => {
            if (r.success) setBankItems(r.data ?? []);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshSession = useCallback(async () => {
        if (!session) return;
        const r = await partyCallApi.getSessionStatus(session.sessionId);
        if (r.success) setSession(r.data ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.sessionId]);

    const mesh = usePartyCallMesh(session && session.status === "Active" ? session.sessionId : null, mentorUserId, {
        onParticipantJoined: refreshSession,
        onParticipantLeft: refreshSession,
        onChallengePosed: refreshSession,
        onChallengeResponded: refreshSession,
        onChallengeJudged: refreshSession,
        onLeaderboardUpdated: refreshSession,
        onSessionEnded: refreshSession,
    });

    // Check for an already-active session when a party is picked (reconnect/resume).
    useEffect(() => {
        if (!selectedPartyId) {
            setSession(null);
            return;
        }
        partyCallApi.getActiveSessionByParty(selectedPartyId as number).then((r) => {
            if (r.success && r.data) setSession(r.data);
        });
    }, [selectedPartyId]);

    const handleStart = async () => {
        if (!selectedPartyId) return;
        setStarting(true);
        setError(null);
        try {
            const r = await partyCallApi.createSession(selectedPartyId as number);
            if (r.success) setSession(r.data ?? null);
            else setError(r.message || "Could not start the session");
        } catch (e: any) {
            setError(e?.response?.data?.message || "Unexpected error");
        } finally {
            setStarting(false);
        }
    };

    const handleEnd = async () => {
        if (!session) return;
        setEnding(true);
        try {
            const r = await partyCallApi.endSession(session.sessionId);
            if (r.success) setSession(r.data ?? null);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Could not end the session");
        } finally {
            setEnding(false);
        }
    };

    const handleSendChallenge = async () => {
        if (!session) return;
        const isFromBank = selectedBankItemId !== "";
        if (!isFromBank && !adHocPrompt.trim()) return;
        if (mode === "ATTACK" && rivalUserId === "") {
            setError("Pick a rival for an Attack challenge");
            return;
        }

        setSending(true);
        setError(null);
        try {
            const r = await partyCallApi.createChallenge(session.sessionId, {
                bankItemId: isFromBank ? (selectedBankItemId as number) : null,
                mode: isFromBank ? undefined : mode,
                promptText: isFromBank ? undefined : adHocPrompt.trim(),
                points: isFromBank ? undefined : points,
                assignedToUserId: assignedToUserId === "" ? null : (assignedToUserId as number),
                rivalUserId: mode === "ATTACK" ? (rivalUserId as number) : null,
            });
            if (r.success) {
                setAdHocPrompt("");
                setSelectedBankItemId("");
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

    const handleJudge = async (challengeId: number, approve: boolean) => {
        if (judgingId !== null) return;
        setJudgingId(challengeId);
        try {
            await partyCallApi.judgeChallenge(challengeId, approve);
            await refreshSession();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Could not judge the challenge");
        } finally {
            setJudgingId(null);
        }
    };

    const leaderboard = useMemo(
        () => (session ? [...session.participants].sort((a, b) => b.score - a.score) : []),
        [session]
    );

    const pendingOrResponded = useMemo(
        () => (session ? session.challenges.filter((c) => c.status === "Pending" || c.status === "Responded") : []),
        [session]
    );
    const judgedChallenges = useMemo(
        () => (session ? session.challenges.filter((c) => c.status === "Approved" || c.status === "Rejected") : []),
        [session]
    );

    const usernameFor = (userId: number | null) =>
        userId == null ? null : session?.participants.find((p) => p.userId === userId)?.username ?? `User ${userId}`;

    return (
        <>
            <PageMeta title="Live Challenge Arena — HabitEvolve" description="Video call PvP challenge session, mentor as referee" />
            <PageBreadcrumb pageTitle="Live Challenge Arena" />

            {error && (
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            {!session || session.status !== "Active" ? (
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 max-w-xl">
                    <h2 className="text-xl font-black mb-4">Start a Live Challenge Arena</h2>

                    {session?.status === "Ended" && (
                        <div className="mb-4 p-4 bg-violet-50 border-2 border-violet-400 rounded-xl">
                            <p className="font-black text-violet-800 mb-2">Final results</p>
                            <div className="space-y-1">
                                {leaderboard.map((p, i) => (
                                    <div key={p.userId} className="flex justify-between text-sm font-bold">
                                        <span>#{p.finalRank ?? i + 1} {p.username}</span>
                                        <span>
                                            {p.score} pts
                                            {p.mGoldAwarded > 0 && (
                                                <span className="ml-2 text-amber-600">+{p.mGoldAwarded} M-Gold</span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {workspace ? (
                        <p className="mb-4 text-sm font-bold">
                            Party: <span className="text-violet-700">{workspace.party.name}</span>
                        </p>
                    ) : (
                        <>
                            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Party</label>
                            <select
                                value={selectedPartyId}
                                onChange={(e) => setSelectedPartyId(e.target.value ? parseInt(e.target.value) : "")}
                                className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white mb-4"
                            >
                                <option value="">Choose a party…</option>
                                {parties.map((p) => (
                                    <option key={p.partyId} value={p.partyId}>{p.name} ({p.memberCount} members)</option>
                                ))}
                            </select>
                        </>
                    )}

                    <button
                        onClick={handleStart}
                        disabled={!selectedPartyId || starting}
                        className="w-full py-3 border-2 border-black rounded-full font-black text-sm bg-violet-500 text-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
                    >
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
                                <div className="absolute top-1 right-1 flex gap-1">
                                    <button
                                        onClick={mesh.toggleMic}
                                        title={mesh.micEnabled ? "Mute mic" : "Unmute mic"}
                                        className={`w-7 h-7 rounded-full border-2 border-black text-xs font-black ${mesh.micEnabled ? "bg-white" : "bg-red-400 text-white"}`}
                                    >
                                        {mesh.micEnabled ? "🎤" : "🔇"}
                                    </button>
                                    <button
                                        onClick={mesh.toggleCamera}
                                        title={mesh.cameraEnabled ? "Turn camera off" : "Turn camera on"}
                                        className={`w-7 h-7 rounded-full border-2 border-black text-xs font-black ${mesh.cameraEnabled ? "bg-white" : "bg-red-400 text-white"}`}
                                    >
                                        {mesh.cameraEnabled ? "📷" : "🚫"}
                                    </button>
                                </div>
                            </div>
                            {mesh.connectedUserIds.map((uid) => (
                                <VideoTile key={uid} stream={mesh.remoteStreams[uid] ?? null} label={usernameFor(uid) ?? `User ${uid}`} />
                            ))}
                        </div>
                        {mesh.mediaError && (
                            <p className="text-sm font-bold text-red-600">{mesh.mediaError}</p>
                        )}

                        {/* Composer */}
                        <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
                            <h3 className="font-black mb-3">Send a challenge</h3>

                            <div className="mb-3">
                                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">From bank (optional)</label>
                                <select
                                    value={selectedBankItemId}
                                    onChange={(e) => setSelectedBankItemId(e.target.value ? parseInt(e.target.value) : "")}
                                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium bg-white"
                                >
                                    <option value="">— Compose ad-hoc instead —</option>
                                    {bankItems.map((b) => (
                                        <option key={b.bankItemId} value={b.bankItemId}>
                                            [{b.mode === "ATTACK" ? "Attack" : "Self-score"}] {b.promptText} ({b.points} pts)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedBankItemId === "" && (
                                <>
                                    <div className="mb-3">
                                        <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Prompt</label>
                                        <input
                                            value={adHocPrompt}
                                            onChange={(e) => setAdHocPrompt(e.target.value)}
                                            placeholder="e.g. Show me you're drinking water right now!"
                                            className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium"
                                        />
                                    </div>
                                    <div className="flex gap-3 mb-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Mode</label>
                                            <select
                                                value={mode}
                                                onChange={(e) => setMode(e.target.value as ChallengeMode)}
                                                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium bg-white"
                                            >
                                                <option value="SELF_SCORE">Self-score (+points)</option>
                                                <option value="ATTACK">Attack (−points to rival)</option>
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Points</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={points}
                                                onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
                                                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 mb-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Send to</label>
                                    <select
                                        value={assignedToUserId}
                                        onChange={(e) => setAssignedToUserId(e.target.value ? parseInt(e.target.value) : "")}
                                        className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium bg-white"
                                    >
                                        <option value="">Everyone in the call</option>
                                        {session.participants.map((p) => (
                                            <option key={p.userId} value={p.userId}>{p.username}</option>
                                        ))}
                                    </select>
                                </div>
                                {mode === "ATTACK" && selectedBankItemId === "" && (
                                    <div className="flex-1">
                                        <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Rival (loses points)</label>
                                        <select
                                            value={rivalUserId}
                                            onChange={(e) => setRivalUserId(e.target.value ? parseInt(e.target.value) : "")}
                                            className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium bg-white"
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
                                className="w-full py-2.5 border-2 border-black rounded-full font-black text-sm bg-amber-400 shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
                            >
                                {sending ? "Sending…" : "Send challenge"}
                            </button>
                        </div>

                        {/* Pending / responded challenges */}
                        {pendingOrResponded.length > 0 && (
                            <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
                                <h3 className="font-black mb-3">Awaiting judgment</h3>
                                <div className="space-y-2">
                                    {pendingOrResponded.map((c) => (
                                        <div key={c.challengeId} className="flex items-center justify-between gap-3 p-3 border-2 border-black rounded-xl">
                                            <div className="min-w-0">
                                                <p className="font-bold truncate">{c.promptText}</p>
                                                <p className="text-xs text-gray-500">
                                                    {c.mode === "ATTACK" ? `⚔️ Attacking ${usernameFor(c.rivalUserId)}` : "⭐ Self-score"} · {c.points} pts ·{" "}
                                                    {c.status === "Responded" ? `${usernameFor(c.respondedByUserId)} says done` : "Waiting for a response"}
                                                </p>
                                            </div>
                                            {c.status === "Responded" && (
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleJudge(c.challengeId, true)}
                                                        disabled={judgingId !== null}
                                                        className="px-3 py-1.5 border-2 border-black rounded-full text-xs font-black bg-emerald-300 hover:bg-emerald-400 disabled:opacity-50"
                                                    >
                                                        {judgingId === c.challengeId ? "…" : "Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleJudge(c.challengeId, false)}
                                                        disabled={judgingId !== null}
                                                        className="px-3 py-1.5 border-2 border-black rounded-full text-xs font-black bg-red-200 hover:bg-red-300 disabled:opacity-50"
                                                    >
                                                        {judgingId === c.challengeId ? "…" : "Reject"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {judgedChallenges.length > 0 && (
                            <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
                                <h3 className="font-black mb-3">History</h3>
                                <div className="space-y-1.5">
                                    {judgedChallenges.map((c) => (
                                        <div key={c.challengeId} className="flex justify-between text-sm">
                                            <span className="truncate font-medium">{c.promptText}</span>
                                            <span className={`font-black ${c.status === "Approved" ? "text-emerald-600" : "text-red-500"}`}>{c.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-[#1a1a2e] border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 text-white h-fit">
                        <h2 className="text-xl font-black mb-4">Leaderboard</h2>
                        <div className="space-y-2">
                            {leaderboard.map((p, i) => (
                                <div key={p.userId} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                                    <span className="font-bold">#{i + 1} {p.username}</span>
                                    <span className="font-black text-amber-300">{p.score} pts</span>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-sm text-gray-400">No one has joined yet.</p>}
                        </div>

                        <button
                            onClick={handleEnd}
                            disabled={ending}
                            className="w-full mt-6 py-3 border-2 border-black rounded-full font-black text-sm bg-red-500 text-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
                        >
                            {ending ? "Ending…" : "End session"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
