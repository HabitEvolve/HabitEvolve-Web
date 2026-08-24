import { useCallback, useRef, useState } from 'react';
import partyCallApi from '../api/partyCallApi';
import type { LiveChallengeDto, LiveChallengeEvidenceDto } from '../types/partyCall.types';

/**
 * "Đấu Trường Trực Tiếp" — mentor client tự record bằng chứng (clip + snapshot) từ
 * remoteStream của người thực hiện challenge, KHÔNG phải player tự nộp. Trọng tài ghi
 * lại, người bị kiểm tra không can thiệp được vào bằng chứng của chính mình.
 *
 * Vòng đời: challenge.started (player bấm "Bắt đầu") → startFor() bắt đầu MediaRecorder trên
 * đúng peer (hoặc mọi peer nếu challenge mở cho cả call) → challenge.responded → stopAndUpload()
 * dừng, giữ lại clip của đúng người đã respond, huỷ phần còn lại, rồi upload lên BE.
 * (Trước đây bắt đầu ngay lúc challenge.posed — ghi thừa cả thời gian chờ từ lúc mentor gửi
 * tới lúc player thực sự bắt tay vào làm; đổi 2026-08-24.)
 *
 * ⚠️ EVIDENCE_MAX_SECONDS/SNAPSHOT_COUNT khớp default của party_call.evidence_max_seconds/
 * evidence_snapshot_count phía BE — BE mới là nguồn sự thật cho việc gating, giá trị ở đây
 * chỉ để client tự dừng ghi hợp lý, không cần đọc SystemConfig qua network cho việc này.
 */
const EVIDENCE_MAX_SECONDS = 30;
const SNAPSHOT_COUNT = 3;

interface PeerRecording {
    subjectUserId: number;
    stream: MediaStream;
    videoEl: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    recorder: MediaRecorder;
    chunks: Blob[];
    snapshots: Blob[];
    snapshotTimer: ReturnType<typeof setInterval>;
    autoStopTimer: ReturnType<typeof setTimeout>;
    startedAt: string;
    stopped: boolean;
}

function captureSnapshot(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<Blob | null> {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return Promise.resolve(null);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8));
}

export function useChallengeEvidenceRecorder(remoteStreams: Record<number, MediaStream>) {
    // challengeId -> { subjectUserId -> PeerRecording } — an "open to everyone" challenge
    // records every connected peer until we know who actually responded.
    const recordingsRef = useRef<Record<number, Record<number, PeerRecording>>>({});
    const [recordingChallengeIds, setRecordingChallengeIds] = useState<Set<number>>(new Set());
    const [uploadingChallengeIds, setUploadingChallengeIds] = useState<Set<number>>(new Set());
    const remoteStreamsRef = useRef(remoteStreams);
    remoteStreamsRef.current = remoteStreams;

    const markRecording = useCallback((challengeId: number, on: boolean) => {
        setRecordingChallengeIds((prev) => {
            const next = new Set(prev);
            if (on) next.add(challengeId); else next.delete(challengeId);
            return next;
        });
    }, []);

    const startPeerRecording = useCallback((challengeId: number, subjectUserId: number, stream: MediaStream) => {
        const videoEl = document.createElement('video');
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.srcObject = stream;
        void videoEl.play().catch(() => {});
        const canvas = document.createElement('canvas');

        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 300_000 });
        } catch {
            recorder = new MediaRecorder(stream);
        }

        const entry: PeerRecording = {
            subjectUserId, stream, videoEl, canvas, recorder,
            chunks: [], snapshots: [],
            snapshotTimer: setInterval(() => {}, 2_147_483_647), // placeholder, replaced below
            autoStopTimer: setTimeout(() => {}, 0),
            startedAt: new Date().toISOString(),
            stopped: false,
        };
        clearInterval(entry.snapshotTimer);
        clearTimeout(entry.autoStopTimer);

        recorder.ondataavailable = (e) => { if (e.data.size > 0) entry.chunks.push(e.data); };
        recorder.start();

        // Đều nhau trong cửa sổ ghi tối đa — cắt vài khung để gửi cho AI.
        const snapshotIntervalMs = (EVIDENCE_MAX_SECONDS * 1000) / (SNAPSHOT_COUNT + 1);
        entry.snapshotTimer = setInterval(() => {
            if (entry.snapshots.length >= SNAPSHOT_COUNT) return;
            void captureSnapshot(videoEl, canvas).then((blob) => { if (blob) entry.snapshots.push(blob); });
        }, snapshotIntervalMs);

        entry.autoStopTimer = setTimeout(() => stopPeerRecording(entry), EVIDENCE_MAX_SECONDS * 1000);

        recordingsRef.current[challengeId] = { ...recordingsRef.current[challengeId], [subjectUserId]: entry };
    }, []);

    function stopPeerRecording(entry: PeerRecording) {
        if (entry.stopped) return;
        entry.stopped = true;
        clearInterval(entry.snapshotTimer);
        clearTimeout(entry.autoStopTimer);
        if (entry.recorder.state !== 'inactive') entry.recorder.stop();
        entry.videoEl.srcObject = null;
    }

    /** Gọi khi challenge.started — bắt đầu ghi đúng người được giao, hoặc mọi peer nếu mở cho cả call. */
    const startFor = useCallback((challenge: LiveChallengeDto) => {
        if (!challenge.requiresEvidence) return;
        recordingsRef.current[challenge.challengeId] = {};

        const targets = challenge.assignedToUserId != null
            ? [challenge.assignedToUserId]
            : Object.keys(remoteStreamsRef.current).map(Number);

        for (const userId of targets) {
            const stream = remoteStreamsRef.current[userId];
            if (stream) startPeerRecording(challenge.challengeId, userId, stream);
        }
        if (targets.length > 0) markRecording(challenge.challengeId, true);
    }, [markRecording, startPeerRecording]);

    /** Gọi khi challenge.responded — dừng ghi, giữ lại clip của đúng người đã respond, huỷ phần còn lại, rồi upload. */
    const stopAndUpload = useCallback(async (challengeId: number, respondedByUserId: number) => {
        const peers = recordingsRef.current[challengeId];
        delete recordingsRef.current[challengeId];
        markRecording(challengeId, false);
        if (!peers) return null;

        for (const [userId, entry] of Object.entries(peers)) {
            if (Number(userId) !== respondedByUserId) stopPeerRecording(entry);
        }
        const winner = peers[respondedByUserId];
        if (!winner) return null;

        stopPeerRecording(winner);
        // MediaRecorder.stop() flushes the last chunk asynchronously — give it a tick.
        await new Promise((r) => setTimeout(r, 150));

        const clip = new Blob(winner.chunks, { type: 'video/webm' });
        if (clip.size === 0) return null;

        setUploadingChallengeIds((prev) => new Set(prev).add(challengeId));
        try {
            const videoTrack = winner.stream.getVideoTracks()[0];
            const subjectCameraOn = !!videoTrack && videoTrack.readyState === 'live' && !videoTrack.muted;

            const result = await partyCallApi.uploadEvidence(challengeId, {
                subjectUserId: respondedByUserId,
                clip,
                snapshots: winner.snapshots,
                subjectCameraOn,
                capturedFromUtc: winner.startedAt,
                capturedToUtc: new Date().toISOString(),
            });
            return result.success ? (result.data as LiveChallengeEvidenceDto) : null;
        } finally {
            setUploadingChallengeIds((prev) => { const next = new Set(prev); next.delete(challengeId); return next; });
        }
    }, [markRecording]);

    /** Dọn mọi recorder đang chạy — gọi khi session kết thúc hoặc component unmount. */
    const stopAll = useCallback(() => {
        for (const peers of Object.values(recordingsRef.current)) {
            for (const entry of Object.values(peers)) stopPeerRecording(entry);
        }
        recordingsRef.current = {};
        setRecordingChallengeIds(new Set());
    }, []);

    return { startFor, stopAndUpload, stopAll, recordingChallengeIds, uploadingChallengeIds };
}
