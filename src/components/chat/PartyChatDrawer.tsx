import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from '@microsoft/signalr';
import { PaperPlaneIcon } from '../../icons';
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
// OUTSIDE the app's `.admin-content` wrapper and gets none of the ambient
// `.dark .admin-content .bg-*` overrides. Every surface here needs its own
// explicit dark: pair or it stays glaring-bright in dark mode.
const inkBorder = 'border-game-outline dark:border-brand-300';
const inkShadowSm = 'shadow-[2px_2px_0_0_var(--color-game-outline)] dark:shadow-[2px_2px_0_0_var(--color-brand-300)]';
const inkShadowMd = 'shadow-[3px_3px_0_0_var(--color-game-outline)] dark:shadow-[3px_3px_0_0_var(--color-brand-300)]';

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

const SystemBubble = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex justify-center px-4">
    <div className={`bg-warning-100 dark:bg-warning-500/20 border-2 ${inkBorder} ${inkShadowSm} rounded-xl px-4 py-2 text-center max-w-[85%]`}>
      <p className="text-xs font-black text-gray-900 dark:text-gray-100">{msg.content}</p>
      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-0.5 block">{fmtTime(msg.sentAt)}</span>
    </div>
  </div>
);

const MyBubble = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex flex-col items-end gap-0.5">
    <div className="max-w-[78%]">
      <div className={`bg-brand-200 dark:bg-brand-500/30 border-2 ${inkBorder} ${inkShadowSm} rounded-xl rounded-tr-none px-3 py-2`}>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{msg.content}</p>
      </div>
    </div>
    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mr-1">{fmtTime(msg.sentAt)}</span>
  </div>
);

const PlayerBubble = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex items-end gap-2">
    <span className={`w-7 h-7 rounded-full border-2 ${inkBorder} bg-linear-to-br from-purple-200 to-blue-200 dark:from-purple-500/30 dark:to-blue-500/30 text-xs font-black flex items-center justify-center shrink-0`}>
      {senderInitial(msg)}
    </span>
    <div className="max-w-[78%]">
      <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-0.5 ml-0.5">{msg.senderUsername ?? ''}</p>
      <div className={`bg-gray-25 dark:bg-gray-800 border-2 ${inkBorder} ${inkShadowSm} rounded-xl rounded-tl-none px-3 py-2`}>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{msg.content}</p>
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-0.5 mt-0.5 block">
        {fmtTime(msg.sentAt)}
      </span>
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
      .withUrl(HUB_URL)
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

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">

      {/* ── Backdrop ── */}
      <div
        className={`absolute inset-0 bg-game-outline/50 backdrop-blur-sm transition-opacity duration-300 ${panelIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Close chat"
      />

      {/* ── Drawer panel ── */}
      <div
        className={`relative z-10 h-full w-[400px] max-w-[95vw] flex flex-col bg-gray-25 dark:bg-gray-800 border-l-4 ${inkBorder} shadow-[-8px_0_0_0_var(--color-game-outline)] dark:shadow-[-8px_0_0_0_var(--color-brand-300)] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${panelIn ? 'translate-x-0' : 'translate-x-full'}`}
      >

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-5 py-4 border-b-4 ${inkBorder} bg-gray-25 dark:bg-gray-800 shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${inkBorder} bg-brand-200 dark:bg-brand-500/30 ${inkShadowSm} shrink-0`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Party Chat</p>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{partyName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Connection status dot — real semantic state, not decoration */}
            <span
              title={connected ? 'Real-time connected' : 'Connecting…'}
              className={`w-2 h-2 rounded-full border border-game-outline dark:border-brand-300 ${connected ? 'bg-success-500' : 'bg-warning-400 animate-pulse'}`}
            />
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className={`flex items-center justify-center w-8 h-8 border-2 ${inkBorder} rounded-xl bg-gray-25 dark:bg-gray-700 ${inkShadowSm} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Message area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 dark:text-gray-500">
              <Spinner size={24} />
              <span className="text-sm font-bold">Loading messages…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-8">
              <span className={`flex items-center justify-center w-14 h-14 rounded-full border-[3px] ${inkBorder} bg-brand-100 dark:bg-brand-500/20`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-700 dark:text-brand-300">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <p className="font-black text-gray-700 dark:text-gray-200 text-base">No messages yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium max-w-[200px] leading-relaxed">
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
        <div className={`shrink-0 border-t-4 ${inkBorder} p-4 bg-gray-25 dark:bg-gray-800`}>
          {sendError && (
            <p className="text-xs font-bold text-error-600 dark:text-error-300 bg-error-50 dark:bg-error-500/15 border border-error-200 rounded-lg px-3 py-1.5 mb-2">
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
              className={`flex-1 border-4 ${inkBorder} rounded-lg px-4 py-2.5 text-sm font-medium bg-gray-25 dark:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-200 dark:focus:ring-brand-500/20 focus:border-brand-400 placeholder:text-gray-400`}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className={[
                'flex items-center justify-center w-11 h-11 shrink-0',
                `bg-brand-300 border-2 ${inkBorder} rounded-xl`,
                inkShadowMd,
                'active:shadow-none active:translate-x-[3px] active:translate-y-[3px]',
                'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'disabled:translate-x-0 disabled:translate-y-0',
                'disabled:shadow-[3px_3px_0_0_var(--color-game-outline)] dark:disabled:shadow-[3px_3px_0_0_var(--color-brand-300)]',
              ].join(' ')}
            >
              {sending ? <Spinner size={14} /> : <PaperPlaneIcon className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1.5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-success-500' : 'bg-warning-400 animate-pulse'}`} />
            {connected ? 'Real-time connected' : 'Connecting to real-time…'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
