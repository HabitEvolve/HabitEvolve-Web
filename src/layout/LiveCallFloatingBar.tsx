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
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 pl-3 pr-2 py-2 bg-[#1a1a2e] border-2 border-black rounded-full shadow-[4px_4px_0_0_#1A1D20] text-white">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <div className="min-w-0 leading-tight">
                <p className="text-xs font-black tracking-wide">LIVE{partyName ? ` · ${partyName}` : ""}</p>
                <p className="text-[11px] font-medium text-gray-300">{inCall} in call</p>
            </div>
            <button
                onClick={() => navigate(arenaPath)}
                className="px-3 py-1.5 border-2 border-black rounded-full text-xs font-black bg-violet-500 hover:bg-violet-400 transition-colors shrink-0"
            >
                Open
            </button>
            <button
                onClick={handleEnd}
                disabled={ending}
                title="End session"
                className="w-7 h-7 shrink-0 flex items-center justify-center border-2 border-black rounded-full bg-red-500 hover:bg-red-400 disabled:opacity-50 transition-colors"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}
