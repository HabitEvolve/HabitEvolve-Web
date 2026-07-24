import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { notificationApi, type NotificationDto } from "../../api/notificationApi";

const POLL_MS = 30_000;

const fmtRelative = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationDropdown() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success && typeof res.data === "number") setUnreadCount(res.data);
    } catch { /* silent — bell just shows no badge */ }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications({ pageSize: 10 });
      setItems(res.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const tick = setInterval(refreshUnreadCount, POLL_MS);
    return () => clearInterval(tick);
  }, [refreshUnreadCount]);

  const handleClick = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchList();
  };

  const closeDropdown = () => setIsOpen(false);

  const handleItemClick = async (n: NotificationDto) => {
    if (!n.isRead) {
      try {
        await notificationApi.markAsRead(n.notificationId);
        setItems(prev => prev.map(x => x.notificationId === n.notificationId ? { ...x, isRead: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch { /* silent */ }
    }
    closeDropdown();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <div className="relative">
      {/* ── BELL BUTTON ───────────────────────────────────────────── */}
      <button
        onClick={handleClick}
        aria-label={t("notifications.title")}
        className="relative flex items-center justify-center w-11 h-11 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded-full shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all text-gray-800 dark:text-gray-200"
      >
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 z-10 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500 border-[1.5px] border-white" />
          </span>
        )}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" />
        </svg>
      </button>

      {/* ── NOTIFICATION PANEL ────────────────────────────────────── */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] lg:right-0 mt-3 w-[350px] sm:w-[370px] bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] flex flex-col overflow-hidden"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-gray-700 dark:to-gray-700 border-b-2 border-black dark:border-gray-600 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <h5 className="text-base font-black text-gray-900 dark:text-white">{t("notifications.title")}</h5>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[22px] px-1.5 bg-orange-400 border-2 border-black rounded-full text-[10px] font-black text-white shadow-[1px_1px_0_0_#1A1D20]">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={closeDropdown}
            className="flex items-center justify-center w-7 h-7 bg-white dark:bg-gray-700 border-2 border-black dark:border-gray-500 rounded-lg shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-gray-800 dark:text-gray-300"
            aria-label={t("notifications.close")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Notification list */}
        <ul className="flex flex-col overflow-y-auto max-h-[380px] divide-y-2 divide-gray-100 dark:divide-gray-700">
          {loading ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400 font-semibold">Loading…</li>
          ) : items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400 font-semibold">No notifications yet.</li>
          ) : (
            items.map((n) => (
              <li key={n.notificationId}>
                <button
                  onClick={() => handleItemClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors ${!n.isRead ? "bg-orange-50/50 dark:bg-gray-700/50" : ""}`}
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? "bg-gray-300" : "bg-orange-500"}`} />
                  <span className="block flex-1 min-w-0">
                    <span className="block text-sm text-gray-700 dark:text-gray-300 font-black leading-snug">
                      {n.title}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 line-clamp-2">
                      {n.body}
                    </span>
                    <span className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 font-semibold">
                      {fmtRelative(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer CTA */}
        <div className="p-3 border-t-2 border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center justify-center w-full py-2.5 border-2 border-black dark:border-gray-500 rounded-full bg-white dark:bg-gray-800 font-black text-sm text-gray-800 dark:text-gray-200 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark all as read
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
