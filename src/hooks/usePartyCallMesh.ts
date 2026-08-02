import { useEffect, useRef, useState, useCallback } from 'react';
import { connectPartyCall, type PartyCallConnection } from '../services/partyCallHub';

/**
 * Mesh WebRTC cho "Đấu Trường Trực Tiếp" — mỗi participant nối trực tiếp mọi participant khác
 * (chỉ khả thi vì call bị giới hạn cứng ~6 người, xem `party_call.max_participants`).
 * Quy ước tránh glare: người ĐÃ CÓ MẶT tự tạo offer gửi tới người MỚI vào — người mới chỉ
 * chờ nhận offer và trả answer, không bao giờ tự khởi tạo trước.
 */

// TURN (Open Relay Project, free public relay) as a fallback when STUN-only P2P fails —
// e.g. an Android emulator's virtual NAT often can't establish a direct media path.
// ⚠️ Free/shared — fine for testing, swap for a real TURN account before production.
const ICE_SERVERS: RTCIceServer[] = [
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "7b4ec8d1e404dadbf8605261",
        credential: "OQb8WbZtx7yrL1pM",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "7b4ec8d1e404dadbf8605261",
        credential: "OQb8WbZtx7yrL1pM",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "7b4ec8d1e404dadbf8605261",
        credential: "OQb8WbZtx7yrL1pM",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "7b4ec8d1e404dadbf8605261",
        credential: "OQb8WbZtx7yrL1pM",
      },
  ];

export interface PartyCallGameHandlers {
  onParticipantJoined?: (userId: number) => void;
  onParticipantLeft?: (userId: number) => void;
  onChallengePosed?: (challenge: unknown) => void;
  onChallengeResponded?: (challenge: unknown) => void;
  onChallengeJudged?: (challenge: unknown) => void;
  onLeaderboardUpdated?: (leaderboard: { userId: number; score: number }[]) => void;
  onSessionEnded?: (session: unknown) => void;
}

export function usePartyCallMesh(
  sessionId: number | null,
  myUserId: number,
  gameHandlers: PartyCallGameHandlers
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [connectedUserIds, setConnectedUserIds] = useState<number[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const peersRef = useRef<Record<number, RTCPeerConnection>>({});
  const hubRef = useRef<PartyCallConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<number | null>(sessionId);
  sessionIdRef.current = sessionId;

  const removePeer = useCallback((userId: number) => {
    peersRef.current[userId]?.close();
    delete peersRef.current[userId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setConnectedUserIds((prev) => prev.filter((id) => id !== userId));
  }, []);

  const createPeer = useCallback((targetUserId: number, isInitiator: boolean) => {
    if (peersRef.current[targetUserId]) return peersRef.current[targetUserId];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current[targetUserId] = pc;

    pc.ontrack = (e) => setRemoteStreams((prev) => ({ ...prev, [targetUserId]: e.streams[0] }));
    pc.onicecandidate = (e) => {
      if (e.candidate && sessionIdRef.current) {
        void hubRef.current?.sendIceCandidate(sessionIdRef.current, targetUserId, e.candidate.toJSON());
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (sessionIdRef.current && pc.localDescription) {
            await hubRef.current?.sendOffer(sessionIdRef.current, targetUserId, pc.localDescription.toJSON());
          }
        } catch {
          // ignore — ICE renegotiation races are non-fatal
        }
      };
    }

    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    return pc;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setMediaError('Could not access camera/microphone');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const hub = connectPartyCall({
        onParticipantJoined: ({ userId }) => {
          if (userId === myUserId) return;
          setConnectedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
          createPeer(userId, true);
          gameHandlers.onParticipantJoined?.(userId);
        },
        onParticipantLeft: ({ userId }) => {
          removePeer(userId);
          gameHandlers.onParticipantLeft?.(userId);
        },
        onOffer: async ({ fromUserId, payload }) => {
          if (fromUserId == null) return;
          const pc = createPeer(fromUserId, false);
          await pc.setRemoteDescription(payload);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (sessionIdRef.current && pc.localDescription) {
            await hub.sendAnswer(sessionIdRef.current, fromUserId, pc.localDescription.toJSON());
          }
          setConnectedUserIds((prev) => (prev.includes(fromUserId) ? prev : [...prev, fromUserId]));
          gameHandlers.onParticipantJoined?.(fromUserId);
        },
        onAnswer: async ({ fromUserId, payload }) => {
          if (fromUserId == null) return;
          await peersRef.current[fromUserId]?.setRemoteDescription(payload);
        },
        onIceCandidate: async ({ fromUserId, payload }) => {
          if (fromUserId == null) return;
          try {
            await peersRef.current[fromUserId]?.addIceCandidate(payload);
          } catch {
            // ignore — candidate arriving before remote description is set
          }
        },
        onChallengePosed: gameHandlers.onChallengePosed,
        onChallengeResponded: gameHandlers.onChallengeResponded,
        onChallengeJudged: gameHandlers.onChallengeJudged,
        onLeaderboardUpdated: gameHandlers.onLeaderboardUpdated,
        onSessionEnded: gameHandlers.onSessionEnded,
      });
      hubRef.current = hub;
      await hub.joinCall(sessionId, myUserId);
    })();

    return () => {
      cancelled = true;
      if (sessionIdRef.current) void hubRef.current?.leaveCall(sessionIdRef.current, myUserId);
      void hubRef.current?.stop();
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setRemoteStreams({});
      setConnectedUserIds([]);
      setLocalStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, myUserId]);

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  return { localStream, remoteStreams, connectedUserIds, mediaError, micEnabled, cameraEnabled, toggleMic, toggleCamera };
}
