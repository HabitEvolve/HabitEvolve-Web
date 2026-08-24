import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import partyCallApi from "../api/partyCallApi";
import { usePartyCallMesh } from "../hooks/usePartyCallMesh";
import { useChallengeEvidenceRecorder } from "../hooks/useChallengeEvidenceRecorder";
import type { LiveChallengeDto, LiveChallengeSessionDto } from "../types/partyCall.types";

/**
 * Lives at MentorLayout level (mounted for the whole Mentor Portal, not just the
 * Live Arena tab) so the WebRTC mesh survives navigation between workspace tabs
 * or away to another mentor page. It only tears down on an explicit "End session",
 * a hard reload/tab close, or logout.
 */

const getMentorId = () => {
    const id = localStorage.getItem("user_id");
    return id ? parseInt(id, 10) : 0;
};

interface LiveCallContextValue {
    session: LiveChallengeSessionDto | null;
    partyName: string | null;
    starting: boolean;
    ending: boolean;
    error: string | null;
    setError: (message: string | null) => void;
    mesh: ReturnType<typeof usePartyCallMesh>;
    /** Challenge nào đang bị mentor client ghi hình / đang upload bằng chứng — dùng cho chip "● REC". */
    recordingChallengeIds: Set<number>;
    uploadingEvidenceChallengeIds: Set<number>;
    startSession: (partyId: number, partyName: string) => Promise<void>;
    endSession: () => Promise<void>;
    refreshSession: () => Promise<void>;
    resumeActiveSession: (partyId: number, partyName: string) => Promise<void>;
}

const LiveCallContext = createContext<LiveCallContextValue | null>(null);

export function LiveCallProvider({ children }: { children: ReactNode }) {
    const mentorUserId = getMentorId();

    const [session, setSession] = useState<LiveChallengeSessionDto | null>(null);
    const [partyName, setPartyName] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    const [ending, setEnding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<LiveChallengeSessionDto | null>(null);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    const refreshSession = useCallback(async () => {
        const current = sessionRef.current;
        if (!current) return;
        const r = await partyCallApi.getSessionStatus(current.sessionId);
        if (r.success) setSession(r.data ?? null);
    }, []);

    // Evidence recorder needs mesh.remoteStreams, which only exists after calling
    // usePartyCallMesh — but usePartyCallMesh's handlers need to call into the recorder.
    // Break the cycle with a ref kept current every render (assignment below, after both
    // hooks are called); by the time SignalR actually fires an event the ref is populated.
    const evidenceRecorderRef = useRef<ReturnType<typeof useChallengeEvidenceRecorder> | null>(null);

    const mesh = usePartyCallMesh(
        session && session.status === "Active" ? session.sessionId : null,
        mentorUserId,
        {
            onParticipantJoined: refreshSession,
            onParticipantLeft: refreshSession,
            onChallengePosed: (challenge) => {
                evidenceRecorderRef.current?.startFor(challenge as LiveChallengeDto);
                void refreshSession();
            },
            onChallengeResponded: (challenge) => {
                const c = challenge as LiveChallengeDto;
                if (c.respondedByUserId != null) {
                    void evidenceRecorderRef.current?.stopAndUpload(c.challengeId, c.respondedByUserId).then(refreshSession);
                } else {
                    void refreshSession();
                }
            },
            onChallengeJudged: refreshSession,
            onLeaderboardUpdated: refreshSession,
            onSessionEnded: refreshSession,
        }
    );

    const evidenceRecorder = useChallengeEvidenceRecorder(mesh.remoteStreams);
    evidenceRecorderRef.current = evidenceRecorder;

    // Session no longer active (ended/reconnect) — nothing left worth recording.
    useEffect(() => {
        if (!session || session.status !== "Active") evidenceRecorder.stopAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.status]);

    // Warn before an actual browser tab close/reload — that's the one case a live
    // call really can't survive.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (sessionRef.current?.status !== "Active") return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    const startSession = useCallback(async (partyId: number, name: string) => {
        setStarting(true);
        setError(null);
        try {
            const r = await partyCallApi.createSession(partyId);
            if (r.success) {
                setSession(r.data ?? null);
                setPartyName(name);
            } else {
                setError(r.message || "Could not start the session");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "Unexpected error");
        } finally {
            setStarting(false);
        }
    }, []);

    const endSession = useCallback(async () => {
        const current = sessionRef.current;
        if (!current) return;
        setEnding(true);
        try {
            const r = await partyCallApi.endSession(current.sessionId);
            if (r.success) setSession(r.data ?? null);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Could not end the session");
        } finally {
            setEnding(false);
        }
    }, []);

    // Reconnect/resume: only checked when the caller doesn't already have an
    // active session tracked (e.g. mentor refreshed the page mid-call).
    const resumeActiveSession = useCallback(async (partyId: number, name: string) => {
        if (sessionRef.current?.status === "Active") return;
        const r = await partyCallApi.getActiveSessionByParty(partyId);
        if (r.success && r.data) {
            setSession(r.data);
            setPartyName(name);
        }
    }, []);

    return (
        <LiveCallContext.Provider
            value={{
                session, partyName, starting, ending, error, setError, mesh,
                recordingChallengeIds: evidenceRecorder.recordingChallengeIds,
                uploadingEvidenceChallengeIds: evidenceRecorder.uploadingChallengeIds,
                startSession, endSession, refreshSession, resumeActiveSession,
            }}
        >
            {children}
        </LiveCallContext.Provider>
    );
}

export function useLiveCall() {
    const ctx = useContext(LiveCallContext);
    if (!ctx) throw new Error("useLiveCall must be used within a LiveCallProvider");
    return ctx;
}
