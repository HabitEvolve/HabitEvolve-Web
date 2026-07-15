import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import mentorWalletApi from '../../api/mentorWalletApi';

// ── TYPES ─────────────────────────────────────────────────────────────────────
type PaymentStatus = 'LOADING' | 'SUCCESS' | 'FAILED' | 'CANCELED';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// Gradient background — matches global brand palette (light mode only, page is standalone)
const DOT_BG: React.CSSProperties = {
    background: 'linear-gradient(135deg, #f4fafd 0%, #e4f4ec 50%, #fef9ed 100%)',
};

// Minimum time (ms) the LOADING view is shown regardless of how fast the API responds.
// Keeps the "Goblin Bank verification" moment from feeling like a blink.
const MIN_LOADING_MS = 1800;

// ── PARAM RESOLVER ────────────────────────────────────────────────────────────
// Handles multiple payment gateway redirect formats:
//   SePay   → ?payment=success|error|cancel  &orderId=GEM-{id}
//   VNPay   → ?vnp_ResponseCode=00           &orderId=...   &vnp_Amount=...
//   Generic → ?status=success|failed
const resolveStatus = (params: URLSearchParams): PaymentStatus => {
    const payment = params.get('payment');
    if (payment === 'success') return 'SUCCESS';
    if (payment === 'error') return 'FAILED';
    if (payment === 'cancel') return 'CANCELED';

    const vnpCode = params.get('vnp_ResponseCode');
    if (vnpCode === '00') return 'SUCCESS';
    if (vnpCode !== null) return 'FAILED'; // any other VNPay code = declined

    const status = params.get('status');
    if (status === 'success') return 'SUCCESS';
    if (status) return 'FAILED';

    return 'FAILED'; // direct navigation without params
};

// ── LOADING VIEW ──────────────────────────────────────────────────────────────
const LoadingView = () => (
    <div style={DOT_BG} className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
            {/* Bouncing coin with decorative corner accents */}
            <div className="relative">
                <div className="w-36 h-36 bg-amber-300 border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] flex items-center justify-center animate-bounce select-none">
                    <span className="text-7xl">🪙</span>
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-400 border-4 border-black rounded-xl rotate-12" />
                <div className="absolute -bottom-2 -left-3 w-8 h-8 bg-amber-200 border-4 border-black rounded-lg -rotate-12" />
            </div>

            <div className="w-full bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#1A1D20] p-7">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                    Transaction Verification
                </p>
                <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-2">
                    Consulting the
                    <br />
                    Goblin Bank...
                </h2>
                <p className="text-sm text-gray-500 font-medium mb-5">
                    Please don't close this tab while we verify your payment.
                </p>
                {/* Staggered bouncing dots */}
                <div className="flex items-center justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-3 h-3 bg-black rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.18}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// ── SUCCESS VIEW ──────────────────────────────────────────────────────────────
interface SuccessViewProps {
    orderId: string | null;
    newBalance: number | null;
    onReturn: () => void;
}

const SuccessView = ({ orderId, newBalance, onReturn }: SuccessViewProps) => (
    <div style={DOT_BG} className="min-h-screen flex items-center justify-center p-6">
        <div className="relative w-full max-w-lg bg-green-300 border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#16a34a] p-10 overflow-hidden">
            {/* Decorative background shapes */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-green-400 border-4 border-black rounded-3xl rotate-12 opacity-60 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-400 border-4 border-black rounded-2xl -rotate-6 opacity-50 pointer-events-none" />
            <div className="absolute top-16 -left-5 w-14 h-14 bg-lime-300 border-4 border-black rounded-xl rotate-45 opacity-40 pointer-events-none" />

            {/* "LOOT OBTAINED!" diagonal ribbon */}
            <div
                className="absolute -top-1 -right-14 bg-yellow-400 border-2 border-black font-black text-xs px-16 py-1.5 rotate-12 shadow-[2px_2px_0_0_#1A1D20] select-none uppercase tracking-widest z-10 pointer-events-none"
                aria-hidden
            >
                LOOT OBTAINED!
            </div>

            {/* Floating sparkle emojis */}
            <span className="absolute top-10 left-7 text-3xl animate-bounce select-none pointer-events-none" style={{ animationDelay: '0.1s' }} aria-hidden>✨</span>
            <span className="absolute top-16 right-20 text-2xl animate-bounce select-none pointer-events-none" style={{ animationDelay: '0.35s' }} aria-hidden>⭐</span>
            <span className="absolute bottom-20 right-7 text-xl animate-bounce select-none pointer-events-none" style={{ animationDelay: '0.6s' }} aria-hidden>💫</span>

            {/* Main content */}
            <div className="relative flex flex-col items-center gap-6 text-center">
                {/* Gem icon card */}
                <div className="w-28 h-28 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] flex items-center justify-center select-none">
                    <span className="text-6xl">💎</span>
                </div>

                <div>
                    <div className="inline-block bg-black text-white font-black text-xs px-4 py-1 rounded-full mb-3 uppercase tracking-widest">
                        Transaction Confirmed
                    </div>
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-tight">
                        Top-up Successful!
                    </h1>
                </div>

                <p className="text-gray-800 font-medium text-base leading-relaxed max-w-xs">
                    Your gems have been safely deposited into your wallet. Time to command your party!
                </p>

                {/* New wallet balance */}
                {newBalance !== null && (
                    <div className="w-full bg-white border-4 border-black rounded-2xl px-6 py-5 shadow-[4px_4px_0_0_#1A1D20]">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                            Wallet Balance
                        </p>
                        <p className="text-5xl font-black text-amber-600 leading-none">
                            {newBalance.toLocaleString()}
                            <span className="text-3xl ml-2">💎</span>
                        </p>
                    </div>
                )}

                {/* Reference */}
                {orderId && (
                    <p className="text-xs text-gray-700 font-medium bg-white/70 border border-black/20 rounded-full px-4 py-1.5">
                        Ref: <span className="font-black">{orderId}</span>
                    </p>
                )}

                {/* CTA */}
                <button
                    onClick={onReturn}
                    className="w-full py-4 border-4 border-black rounded-2xl font-black text-base bg-black text-white uppercase tracking-wide shadow-[6px_6px_0_0_#166534] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all duration-150"
                >
                    Return to Wallet ✦
                </button>
            </div>
        </div>
    </div>
);

// ── FAILED VIEW ───────────────────────────────────────────────────────────────
interface FailedViewProps {
    orderId: string | null;
    onRetry: () => void;
    onDashboard: () => void;
}

const FailedView = ({ orderId, onRetry, onDashboard }: FailedViewProps) => (
    <div style={DOT_BG} className="min-h-screen flex items-center justify-center p-6">
        <div className="relative w-full max-w-lg bg-red-300 border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#dc2626] p-10 overflow-hidden">
            {/* Decorative background shapes */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-red-400 border-4 border-black rounded-3xl rotate-12 opacity-60 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-orange-400 border-4 border-black rounded-2xl -rotate-6 opacity-50 pointer-events-none" />
            <div className="absolute top-20 -left-5 w-14 h-14 bg-rose-200 border-4 border-black rounded-xl rotate-45 opacity-40 pointer-events-none" />

            {/* "QUEST FAILED" diagonal ribbon */}
            <div
                className="absolute -top-1 -right-14 bg-red-600 border-2 border-black text-white font-black text-xs px-16 py-1.5 rotate-12 shadow-[2px_2px_0_0_#1A1D20] select-none uppercase tracking-widest z-10 pointer-events-none"
                aria-hidden
            >
                QUEST FAILED
            </div>

            {/* Main content */}
            <div className="relative flex flex-col items-center gap-6 text-center">
                {/* Warning icon — pulse to indicate failure */}
                <div className="w-28 h-28 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] flex items-center justify-center animate-pulse select-none">
                    <span className="text-6xl">⚠️</span>
                </div>

                <div>
                    <div className="inline-block bg-red-700 text-white font-black text-xs px-4 py-1 rounded-full mb-3 uppercase tracking-widest">
                        Payment Declined
                    </div>
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-tight">
                        Transaction Failed!
                    </h1>
                </div>

                <p className="text-gray-800 font-medium text-base leading-relaxed max-w-xs">
                    The goblins dropped your gold. Don't worry, no funds were deducted from your account.
                </p>

                {/* Reference */}
                {orderId && (
                    <p className="text-xs text-gray-700 font-medium bg-white/70 border border-black/20 rounded-full px-4 py-1.5">
                        Ref: <span className="font-black">{orderId}</span>
                    </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3 w-full">
                    {/* Primary: Try Again */}
                    <button
                        onClick={onRetry}
                        className="w-full py-4 border-4 border-black rounded-2xl font-black text-base bg-black text-white uppercase tracking-wide shadow-[6px_6px_0_0_#991b1b] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all duration-150"
                    >
                        Try Again
                    </button>
                    {/* Secondary/Ghost: Back to Dashboard */}
                    <button
                        onClick={onDashboard}
                        className="w-full py-4 border-4 border-black rounded-2xl font-black text-base bg-white text-black uppercase tracking-wide shadow-[6px_6px_0_0_#1A1D20] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all duration-150"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ── CANCELED VIEW ─────────────────────────────────────────────────────────────
interface CanceledViewProps {
    orderId: string | null;
    onRetry: () => void;
    onDashboard: () => void;
}

const CanceledView = ({ orderId, onRetry, onDashboard }: CanceledViewProps) => (
    <div style={DOT_BG} className="min-h-screen flex items-center justify-center p-6">
        <div className="relative w-full max-w-lg bg-slate-200 dark:bg-slate-800 border-4 border-black dark:border-white rounded-3xl shadow-[6px_6px_0_0_#E85D20] p-10 overflow-hidden">
            {/* Decorative background shapes */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-slate-300 dark:bg-slate-700 border-4 border-black dark:border-white rounded-3xl rotate-12 opacity-60 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-orange-300 dark:bg-orange-500/40 border-4 border-black dark:border-white rounded-2xl -rotate-6 opacity-50 pointer-events-none" />
            <div className="absolute top-20 -left-5 w-14 h-14 bg-amber-200 dark:bg-amber-500/30 border-4 border-black dark:border-white rounded-xl rotate-45 opacity-40 pointer-events-none" />

            {/* "RETREAT!" diagonal ribbon */}
            <div
                className="absolute -top-1 -right-14 bg-game-streak border-2 border-black dark:border-white text-white font-black text-xs px-16 py-1.5 rotate-12 shadow-[2px_2px_0_0_#1A1D20] select-none uppercase tracking-widest z-10 pointer-events-none"
                aria-hidden
            >
                RETREAT!
            </div>

            {/* Main content */}
            <div className="relative flex flex-col items-center gap-6 text-center">
                {/* Retreat icon */}
                <div className="w-28 h-28 bg-white dark:bg-slate-900 border-4 border-black dark:border-white rounded-2xl shadow-[4px_4px_0_0_#1A1D20] flex items-center justify-center select-none">
                    <span className="text-6xl">🏳️</span>
                </div>

                <div>
                    <div className="inline-block bg-black dark:bg-white text-white dark:text-black font-black text-xs px-4 py-1 rounded-full mb-3 uppercase tracking-widest">
                        Transaction Canceled
                    </div>
                    <h1 className="text-4xl font-black text-black dark:text-white uppercase tracking-tight leading-tight">
                        Payment Canceled
                    </h1>
                </div>

                <p className="text-gray-800 dark:text-gray-300 font-medium text-base leading-relaxed max-w-xs">
                    You called off the transaction before it landed. No gems were charged — your gold stays right where it was.
                </p>

                {/* Reference */}
                {orderId && (
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium bg-white/70 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-full px-4 py-1.5">
                        Ref: <span className="font-black">{orderId}</span>
                    </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3 w-full">
                    {/* Primary: Try Again */}
                    <button
                        onClick={onRetry}
                        className="w-full py-4 border-4 border-black dark:border-white rounded-2xl font-black text-base bg-game-streak text-white uppercase tracking-wide shadow-[6px_6px_0_0_#1A1D20] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all duration-150"
                    >
                        Try Again
                    </button>
                    {/* Secondary/Ghost: Back to Dashboard */}
                    <button
                        onClick={onDashboard}
                        className="w-full py-4 border-4 border-black dark:border-white rounded-2xl font-black text-base bg-white dark:bg-slate-900 text-black dark:text-white uppercase tracking-wide shadow-[6px_6px_0_0_#1A1D20] hover:shadow-none hover:translate-x-1.5 hover:translate-y-1.5 transition-all duration-150"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function PaymentResultPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<PaymentStatus>('LOADING');
    const [newBalance, setNewBalance] = useState<number | null>(null);

    const orderId = searchParams.get('orderId');

    useEffect(() => {
        const resolved = resolveStatus(searchParams);

        // Run the minimum display delay and wallet fetch in parallel.
        // Both must finish before we leave the LOADING state.
        const minDelay = new Promise<void>((res) => setTimeout(res, MIN_LOADING_MS));

        const walletFetch =
            resolved === 'SUCCESS'
                ? mentorWalletApi
                      .getWallet()
                      .then((r) => {
                          if (r.success && r.data) setNewBalance(r.data.gemsBalance);
                      })
                      .catch(() => {/* session may have expired — balance stays null, still show success */})
                : Promise.resolve();

        Promise.all([minDelay, walletFetch]).then(() => setStatus(resolved));
    // searchParams is stable after the initial SePay redirect — single run is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goToWallet    = () => navigate('/mentor/subscription', { replace: true });
    const goToDashboard = () => navigate('/mentor/dashboard',    { replace: true });

    if (status === 'LOADING') return <LoadingView />;
    if (status === 'SUCCESS') return <SuccessView orderId={orderId} newBalance={newBalance} onReturn={goToWallet} />;
    if (status === 'CANCELED') return <CanceledView orderId={orderId} onRetry={goToWallet} onDashboard={goToDashboard} />;
    return <FailedView orderId={orderId} onRetry={goToWallet} onDashboard={goToDashboard} />;
}
