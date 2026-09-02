import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from '@microsoft/signalr';
import { MessageSquare, Send, X, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import partyChatApi from '../../api/partyChatApi';
import type { ChatMessage } from '../../types/partyChat.types';

// Hub URL: strip /api suffix from VITE_API_URL, then append hub path
const HUB_URL =
  (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, '') +
  '/hubs/party-chat';

const fmtTime = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

// Derive avatar initial safely (senderUsername is null for SYSTEM messages)
const senderInitial = (msg: ChatMessage) =>
  msg.senderUsername ? msg.senderUsername.charAt(0).toUpperCase() : '?';

// This drawer renders via createPortal straight into document.body, so it sits
// OUTSIDE the app's `.admin-content` wrapper and inherits none of its ambient
// surface rules. Every surface here therefore states its own Sky-Pastel token
// explicitly rather than relying on a parent.
const timestamp = 'text-[10px] font-medium text-sky-ink-3 tabular-nums';

// Peer avatars are tinted from the name so a conversation reads as several
// distinct voices instead of a column of identical circles. Teal is absent on
// purpose — it belongs to success/connected state, not decoration.
const AVATAR_TINTS = [
  'from-sky-deep-lo to-sky-deep',
  'from-sky-violet to-sky-violet-deep',
  'from-sky-peach to-sky-peach-deep',
  'from-sky-rose to-sky-rose-deep',
  'from-sky-1 to-sky-deep-lo',
];
const tintFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % 997;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
};

const Spinner = ({ size = 16 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ── Bubble sub-components ──────────────────────────────────────────────────────

// System notices are the room talking, not a person — centred, no avatar, no
// tail, and peach rather than a status hue since they're informational.
const SystemBubble = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex justify-center px-4">
    <div className="max-w-[85%] rounded-sky-chip bg-sky-peach/14 ring-1 ring-sky-peach/26 px-4 py-2 text-center">
      <p className="text-xs font-semibold text-sky-peach-deep">{msg.content}</p>
      <span className={`block mt-0.5 ${timestamp}`}>{fmtTime(msg.sentAt)}</span>
    </div>
  </div>
);

// The mentor's own messages get the deep fill — the one saturated surface in the
// thread, so your own voice is instantly findable while scrolling.
const MyBubble = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex flex-col items-end gap-0.5">
    <div className="max-w-[78%]">
      <div className="rounded-sky-chip rounded-tr-md bg-linear-to-b from-sky-deep-lo to-sky-deep px-3.5 py-2.5 shadow-sky-chip">
        <p className="text-sm font-medium text-white break-words whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
    <span className={`mr-1 ${timestamp}`}>{fmtTime(msg.sentAt)}</span>
  </div>
);

const PlayerBubble = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex items-end gap-2">
    <span
      className={`grid place-items-center w-7 h-7 shrink-0 rounded-full bg-linear-to-br ${tintFor(msg.senderUsername ?? '?')} font-display text-[11px] font-semibold text-white`}
      aria-hidden="true"
    >
      {senderInitial(msg)}
    </span>
    <div className="max-w-[78%]">
      <p className="ml-0.5 mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-ink-3">
        {msg.senderUsername ?? ''}
      </p>
      <div className="rounded-sky-chip rounded-tl-md bg-white/78 ring-1 ring-white/85 px-3.5 py-2.5">
        <p className="text-sm font-medium text-sky-ink break-words whitespace-pre-wrap">{msg.content}</p>
      </div>
      <span className={`block ml-0.5 mt-0.5 ${timestamp}`}>{fmtTime(msg.sentAt)}</span>
    </div>
  </div>
);

// ── Main drawer ────────────────────────────────────────────────────────────────

interface PartyChatDrawerProps {
  partyId: number;
  partyName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PartyChatDrawer({
  partyId,
  partyName,
  isOpen,
  onClose,
}: PartyChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [connected, setConnected] = useState(false);
  const [panelIn, setPanelIn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const connRef = useRef<HubConnection | null>(null);
  const myId = Number(localStorage.getItem('user_id') ?? 0);

  // Slide-in animation
  useEffect(() => {
    if (!isOpen) { setPanelIn(false); return; }
    const raf = requestAnimationFrame(() => setPanelIn(true));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Initial REST fetch (history before SignalR connects)
  const fetchMessages = useCallback(async () => {
    try {
      const res = await partyChatApi.getMessages(partyId);
      if (res.success && res.data) setMessages(res.data);
    } catch {
      // silent — SignalR delivers new messages anyway
    }
  }, [partyId]);

  // SignalR connection lifecycle
  useEffect(() => {
    if (!isOpen) return;

    // Load history first
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    const conn = new HubConnectionBuilder()
      // withCredentials: false — the BE's CORS policy allows any origin without
      // AllowCredentials(), and this hub doesn't rely on cookies (userId is passed
      // explicitly), so the browser's "wildcard origin + credentials" rejection is avoided.
      // Same fix already applied to partyCallHub.ts's connection.
      .withUrl(HUB_URL, { withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Real-time: new message arrives
    conn.on('message.new', (msg: ChatMessage) => {
      setMessages(prev => {
        // Deduplicate: REST send-response may have already appended it
        if (prev.some(m => m.msgId === msg.msgId)) return prev;
        return [...prev, msg];
      });
    });

    // Real-time: message was soft-deleted
    conn.on('message.deleted', (deletedMsgId: number) => {
      setMessages(prev => prev.filter(m => m.msgId !== deletedMsgId));
    });

    conn.onreconnecting(() => setConnected(false));
    conn.onreconnected(() => setConnected(true));
    conn.onclose(() => setConnected(false));

    connRef.current = conn;

    conn
      .start()
      .then(() => {
        setConnected(true);
        return conn.invoke('JoinParty', partyId);
      })
      .catch(err => {
        console.warn('[SignalR] connect failed:', err);
      });

    return () => {
      setConnected(false);
      const c = connRef.current;
      connRef.current = null;
      if (c) {
        c.invoke('LeaveParty', partyId).catch(() => {}).finally(() => c.stop());
      }
    };
  }, [isOpen, partyId, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input after slide-in
  useEffect(() => {
    if (panelIn) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [panelIn]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSendError('');
    setSending(true);
    try {
      const res = await partyChatApi.sendMessage(partyId, text);
      if (res.success && res.data) {
        // Append immediately; SignalR broadcast will be deduped
        setMessages(prev =>
          prev.some(m => m.msgId === res.data!.msgId) ? prev : [...prev, res.data!]
        );
      } else {
        await fetchMessages();
      }
    } catch {
      setSendError('Failed to send — please try again.');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  // Connection state is never colour-only: hue, icon and words all agree.
  const connLabel = connected ? 'Real-time connected' : 'Connecting to real-time…';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">

      {/* ── Backdrop ── */}
      <div
        className={`absolute inset-0 bg-sky-ink/45 backdrop-blur-[18px] transition-opacity duration-300 ${panelIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Close chat"
      />

      {/* ── Drawer panel ── */}
      <div
        className={`relative z-10 h-full w-100 max-w-[95vw] flex flex-col sky-mesh-bg shadow-[-24px_0_48px_-24px_rgba(36,52,77,0.34)] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${panelIn ? 'translate-x-0' : 'translate-x-full'}`}
      >

        {/* ── Header ── */}
        <div className="relative shrink-0 flex items-center justify-between gap-3 px-5 py-4 bg-white/62 backdrop-blur-xl border-b border-white/70">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center w-9 h-9 shrink-0 rounded-sky-chip bg-sky-deep/12 ring-1 ring-sky-deep/20 text-sky-deep">
              <MessageSquare className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">Party Chat</p>
              <h3 className="font-display text-sm font-semibold text-sky-ink truncate">{partyName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Connection status — hue + glyph, and the full wording lives at the
                bottom of the panel so the dot is never the only carrier. */}
            <span
              title={connLabel}
              className={`inline-grid place-items-center w-7 h-7 rounded-full ${
                connected
                  ? 'bg-sky-teal-bg text-sky-teal'
                  : 'bg-sky-peach/22 text-sky-peach-deep motion-safe:animate-pulse'
              }`}
            >
              {connected
                ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
              <span className="sr-only">{connLabel}</span>
            </span>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="grid place-items-center w-8 h-8 rounded-sky-chip text-sky-ink-2 hover:bg-white/75 hover:text-sky-ink active:scale-95 transition-all duration-150"
            >
              <X className="w-4 h-4" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* ── Message area ── */}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto p-4 space-y-3">
          {loading && messages.length === 0 ? (
            /* Skeleton keeps the thread silhouette — alternating sides — instead
               of collapsing to a centred spinner and jumping on load. */
            <div className="space-y-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="h-11 rounded-sky-chip bg-white/55 ring-1 ring-white/70 animate-pulse"
                    style={{ width: `${52 + ((i * 13) % 26)}%` }}
                  />
                </div>
              ))}
              <span className="sr-only">Loading messages…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-8">
              <span className="relative grid place-items-center w-15 h-15 rounded-full bg-white/60 ring-1 ring-white/80 text-sky-deep">
                <span aria-hidden="true" className="absolute inset-0 rounded-full bg-sky-1/45 blur-xl" />
                <MessageSquare className="relative w-6 h-6" strokeWidth={2.2} />
              </span>
              <p className="font-display text-base font-semibold text-sky-ink">No messages yet</p>
              <p className="text-sm text-sky-ink-3 font-medium max-w-50 leading-relaxed">
                Be the first to say something to your party!
              </p>
            </div>
          ) : (
            messages.map(msg => {
              if (msg.type === 'SYSTEM') return <SystemBubble key={msg.msgId} msg={msg} />;
              if (msg.senderId === myId)  return <MyBubble    key={msg.msgId} msg={msg} />;
              return                             <PlayerBubble key={msg.msgId} msg={msg} />;
            })
          )}
          <div aria-hidden="true" />
        </div>

        {/* ── Input area ── */}
        <div className="relative shrink-0 p-4 bg-white/62 backdrop-blur-xl border-t border-white/70">
          {sendError && (
            <p className="relative overflow-hidden flex items-center gap-2 mb-2 rounded-sky-chip bg-sky-rose/10 ring-1 ring-sky-rose/24 px-3 py-2 pl-4 text-xs font-semibold text-sky-rose-deep">
              <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {sendError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              maxLength={500}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-sky-chip bg-white/72 ring-1 ring-white/85 text-sm font-medium text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className={[
                'grid place-items-center w-11 h-11 shrink-0 rounded-sky-chip text-white',
                'bg-linear-to-b from-sky-deep-lo to-sky-deep shadow-sky-fill',
                'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
                'motion-safe:hover:-translate-y-px active:translate-y-0 active:scale-95',
                'disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none',
                'disabled:translate-y-0 disabled:scale-100',
              ].join(' ')}
            >
              {sending ? <Spinner size={15} /> : <Send className="w-4 h-4" strokeWidth={2.3} />}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-sky-ink-3">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-sky-teal' : 'bg-sky-peach motion-safe:animate-pulse'}`}
            />
            {connLabel}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
