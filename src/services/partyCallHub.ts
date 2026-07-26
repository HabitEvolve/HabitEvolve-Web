import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

/**
 * SignalR client for hub `/hubs/party-call` — tín hiệu WebRTC (offer/answer/ICE) +
 * sự kiện game (challenge.posed/responded/judged, leaderboard.updated, session.ended)
 * cho "Đấu Trường Trực Tiếp". Tách riêng khỏi `partyChatHub.ts` — hub này track
 * connection↔user để relay tín hiệu tới ĐÚNG 1 peer, không chỉ broadcast theo group.
 */

const HUB_URL =
  (import.meta.env.VITE_API_URL ?? 'http://localhost:5191/api').replace(/\/api\/?$/, '') +
  '/hubs/party-call';

export interface RelayedPayload<T = unknown> {
  sessionId: number;
  fromUserId: number | null;
  payload: T;
}

export interface PartyCallHandlers {
  onParticipantJoined?: (p: { sessionId: number; userId: number }) => void;
  onParticipantLeft?: (p: { sessionId: number; userId: number }) => void;
  onOffer?: (p: RelayedPayload<RTCSessionDescriptionInit>) => void;
  onAnswer?: (p: RelayedPayload<RTCSessionDescriptionInit>) => void;
  onIceCandidate?: (p: RelayedPayload<RTCIceCandidateInit>) => void;
  onChallengePosed?: (challenge: unknown) => void;
  onChallengeResponded?: (challenge: unknown) => void;
  onChallengeJudged?: (challenge: unknown) => void;
  onLeaderboardUpdated?: (leaderboard: { userId: number; score: number }[]) => void;
  onSessionEnded?: (session: unknown) => void;
  onStateChange?: (connected: boolean) => void;
}

export interface PartyCallConnection {
  joinCall: (sessionId: number, userId: number) => Promise<boolean>;
  leaveCall: (sessionId: number, userId: number) => Promise<void>;
  sendOffer: (sessionId: number, targetUserId: number, sdp: RTCSessionDescriptionInit) => Promise<void>;
  sendAnswer: (sessionId: number, targetUserId: number, sdp: RTCSessionDescriptionInit) => Promise<void>;
  sendIceCandidate: (sessionId: number, targetUserId: number, candidate: RTCIceCandidateInit) => Promise<void>;
  stop: () => Promise<void>;
}

export function connectPartyCall(handlers: PartyCallHandlers): PartyCallConnection {
  const connection: HubConnection = new HubConnectionBuilder()
    // withCredentials: false — the BE's CORS policy allows any origin without
    // AllowCredentials(), and this hub doesn't rely on cookies (userId is passed
    // explicitly), so the browser's "wildcard origin + credentials" rejection is avoided.
    .withUrl(HUB_URL, { withCredentials: false })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();

  connection.on('participant.joined', (p) => handlers.onParticipantJoined?.(p));
  connection.on('participant.left', (p) => handlers.onParticipantLeft?.(p));
  connection.on('webrtc.offer', (p) => handlers.onOffer?.(p));
  connection.on('webrtc.answer', (p) => handlers.onAnswer?.(p));
  connection.on('webrtc.ice-candidate', (p) => handlers.onIceCandidate?.(p));
  connection.on('challenge.posed', (p) => handlers.onChallengePosed?.(p));
  connection.on('challenge.responded', (p) => handlers.onChallengeResponded?.(p));
  connection.on('challenge.judged', (p) => handlers.onChallengeJudged?.(p));
  connection.on('leaderboard.updated', (p) => handlers.onLeaderboardUpdated?.(p));
  connection.on('session.ended', (p) => handlers.onSessionEnded?.(p));

  connection.onreconnecting(() => handlers.onStateChange?.(false));
  connection.onclose(() => handlers.onStateChange?.(false));
  connection.onreconnected(() => handlers.onStateChange?.(true));

  const ready = connection
    .start()
    .then(() => handlers.onStateChange?.(true))
    .catch(() => handlers.onStateChange?.(false));

  return {
    joinCall: async (sessionId, userId) => {
      await ready;
      return connection.invoke<boolean>('JoinCall', sessionId, userId);
    },
    leaveCall: async (sessionId, userId) => {
      if (connection.state === HubConnectionState.Connected) {
        try {
          await connection.invoke('LeaveCall', sessionId, userId);
        } catch {
          // ignore
        }
      }
    },
    sendOffer: (sessionId, targetUserId, sdp) => connection.invoke('SendOffer', sessionId, targetUserId, sdp),
    sendAnswer: (sessionId, targetUserId, sdp) => connection.invoke('SendAnswer', sessionId, targetUserId, sdp),
    sendIceCandidate: (sessionId, targetUserId, candidate) =>
      connection.invoke('SendIceCandidate', sessionId, targetUserId, candidate),
    stop: async () => {
      try {
        await connection.stop();
      } catch {
        // ignore teardown races
      }
    },
  };
}
