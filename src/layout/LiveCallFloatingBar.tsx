import { useLocation, useNavigate } from "react-router";
import { useLiveCall } from "../context/LiveCallContext";

/**
 * Persistent "still live" pill shown across the whole Mentor Portal while a
 * Live Challenge Arena session is active, so leaving the live-arena tab never
 * silently drops the call. Hidden on the live-arena page itself since the full
 * UI (video grid, End session button) already covers it there.
 */
export default function LiveCallFloatingBar() {
    const { session, partyName, mesh, ending, endSession } = useLiveCall();
    const location = useLocation();
    const navigate = useNavigate();

    if (!session || session.status !== "Active") return null;

    const arenaPath = `/mentor/parties/${session.partyId}/live-arena`;
    if (location.pathname === arenaPath) return null;

    const inCall = mesh.connectedUserIds.length + 1;

    const handleEnd = async () => {
        if (!window.confirm("Kết thúc buổi Đấu Trường Trực Tiếp này cho tất cả mọi người?")) return;
        await endSession();
    };

    return (
        // Deep navy-ink pill rather than glass: this floats over arbitrary page
        // content and has to stay legible on every one of them, so it's the one
        // surface that deliberately opts out of translucency.
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 pl-3.5 pr-2 py-2 rounded-full bg-sky-ink/95 backdrop-blur-[14px] shadow-[0_18px_36px_-16px_rgba(36,52,77,0.75)] ring-1 ring-white/15 text-white sky-in">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-rose opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-rose" />
            </span>
            <div className="min-w-0 leading-tight">
                <p className="font-display text-xs font-semibold tracking-wide">LIVE{partyName ? ` · ${partyName}` : ""}</p>
                <p className="text-[11px] text-white/65 tabular-nums">{inCall} in call</p>
            </div>
            <button
                type="button"
                onClick={() => navigate(arenaPath)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-linear-to-b from-sky-violet to-sky-violet-deep hover:brightness-110 active:scale-95 transition shrink-0"
            >
                Open
            </button>
            <button
                type="button"
                onClick={handleEnd}
                disabled={ending}
                title="End session"
                aria-label="End session"
                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-sky-rose hover:bg-sky-rose-deep disabled:opacity-50 active:scale-95 transition"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}
