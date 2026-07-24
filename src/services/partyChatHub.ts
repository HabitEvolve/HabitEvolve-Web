import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import type { ChatMessage } from '../types/partyChat.types';

/**
 * SignalR client for hub `/hubs/party-chat` (same BE hub used by the Mobile app's
 * `partyChatHub.ts`). After connecting, call `JoinParty(partyId)` to join the
 * SignalR group, then listen for `message.new` (payload ChatMessage) and
 * `message.deleted` (payload messageId). The hub is mapped at the API root —
 * i.e. VITE_API_URL minus its trailing `/api` suffix.
 */

const HUB_URL =
  (import.meta.env.VITE_API_URL ?? 'http://localhost:5191/api').replace(/\/api\/?$/, '') +
  '/hubs/party-chat';

export interface PartyChatHandlers {
  onMessage: (msg: ChatMessage) => void;
  onDeleted: (messageId: number) => void;
  /** Reports connect/reconnect/close so the UI can toggle a polling fallback. */
  onStateChange?: (connected: boolean) => void;
}

export interface PartyChatConnection {
  stop: () => Promise<void>;
}

/**
 * Opens a realtime connection to a party's chat. Auto-reconnects; the caller
 * should keep a polling fallback active while `onStateChange(false)`.
 * Always call `stop()` on unmount.
 */
export function connectPartyChat(
  partyId: number,
  handlers: PartyChatHandlers
): PartyChatConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();

  connection.on('message.new', (payload: ChatMessage) => handlers.onMessage(payload));
  connection.on('message.deleted', (messageId: number) => handlers.onDeleted(Number(messageId)));

  connection.onreconnecting(() => handlers.onStateChange?.(false));
  connection.onclose(() => handlers.onStateChange?.(false));
  connection.onreconnected(async () => {
    // Group membership is per-connection — rejoin after every reconnect.
    try {
      await connection.invoke('JoinParty', partyId);
      handlers.onStateChange?.(true);
    } catch {
      handlers.onStateChange?.(false);
    }
  });

  void (async () => {
    try {
      await connection.start();
      await connection.invoke('JoinParty', partyId);
      handlers.onStateChange?.(true);
    } catch {
      // Hub unreachable — caller keeps polling.
      handlers.onStateChange?.(false);
    }
  })();

  return {
    stop: async () => {
      try {
        if (connection.state === HubConnectionState.Connected) {
          await connection.invoke('LeaveParty', partyId);
        }
      } catch {
        // Already disconnected — nothing to leave.
      }
      try {
        await connection.stop();
      } catch {
        // Ignore teardown races.
      }
    },
  };
}
