import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { CheckCircle2, AlertTriangle, Flag, ArrowLeft, RotateCcw } from 'lucide-react';
import mentorWalletApi from '../../api/mentorWalletApi';
import {
    ResultShell, PrimaryCta, SecondaryCta, OrderRef, BalancePanel, VerifyingView, PAYMENT_ACCENTS,
} from '../../components/mentor/PaymentResultChrome';

// ── TYPES ─────────────────────────────────────────────────────────────────────
type PaymentStatus = 'LOADING' | 'SUCCESS' | 'FAILED' | 'CANCELED';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// Minimum time (ms) the LOADING view is shown regardless of how fast the API responds.
// Keeps the "Goblin Bank verification" moment from feeling like a blink.
const MIN_LOADING_MS = 1800;

// ── PARAM RESOLVER ────────────────────────────────────────────────────────────
// Handles multiple payment gateway redirect formats:
//   SePay   → ?payment=success|error|cancel  &orderId=GEM00000022 (GEM + 8-digit zero-padded id, no dash)
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
    <VerifyingView
        title="Transaction Verification"
        subtitle="Consulting the Goblin Bank…"
        hint="Please don't close this tab while we verify your payment."
    />
);

// ── SUCCESS VIEW ──────────────────────────────────────────────────────────────
interface SuccessViewProps {
    orderId: string | null;
    newBalance: number | null;
    onReturn: () => void;
}

const SuccessView = ({ orderId, newBalance, onReturn }: SuccessViewProps) => (
    // Teal — success is never green (§4).
    <ResultShell
        rail={PAYMENT_ACCENTS.success.rail}
        accent={PAYMENT_ACCENTS.success.chip}
        icon={<CheckCircle2 className="w-9 h-9" />}
        kicker="Transaction Confirmed"
        title="Top-up Successful!"
    >
        <p className="text-sm font-medium text-sky-ink-2 leading-relaxed max-w-xs">
            Your gems have been safely deposited into your wallet. Time to command your party!
        </p>

        {newBalance !== null && <BalancePanel label="Wallet Balance" value={newBalance} />}

        {orderId && <OrderRef orderId={orderId} />}

        <PrimaryCta onClick={onReturn}>
            <ArrowLeft className="w-4 h-4" /> Return to Wallet
        </PrimaryCta>
    </ResultShell>
);

// ── FAILED VIEW ───────────────────────────────────────────────────────────────
interface FailedViewProps {
    orderId: string | null;
    onRetry: () => void;
    onDashboard: () => void;
}

const FailedView = ({ orderId, onRetry, onDashboard }: FailedViewProps) => (
    <ResultShell
        rail={PAYMENT_ACCENTS.failed.rail}
        accent={PAYMENT_ACCENTS.failed.chip}
        icon={<AlertTriangle className="w-9 h-9" />}
        kicker="Payment Declined"
        title="Transaction Failed"
    >
        <p className="text-sm font-medium text-sky-ink-2 leading-relaxed max-w-xs">
            The goblins dropped your gold. Don't worry, no funds were deducted from your account.
        </p>

        {orderId && <OrderRef orderId={orderId} />}

        <div className="flex flex-col gap-2.5 w-full">
            <PrimaryCta onClick={onRetry}>
                <RotateCcw className="w-4 h-4" /> Try Again
            </PrimaryCta>
            <SecondaryCta onClick={onDashboard}>
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </SecondaryCta>
        </div>
    </ResultShell>
);

// ── CANCELED VIEW ─────────────────────────────────────────────────────────────
interface CanceledViewProps {
    orderId: string | null;
    onRetry: () => void;
    onDashboard: () => void;
}

const CanceledView = ({ orderId, onRetry, onDashboard }: CanceledViewProps) => (
    // Peach, not rose: the user chose this. It's an interruption, not a failure.
    <ResultShell
        rail={PAYMENT_ACCENTS.cancelled.rail}
        accent={PAYMENT_ACCENTS.cancelled.chip}
        icon={<Flag className="w-9 h-9" />}
        kicker="Transaction Canceled"
        title="Payment Canceled"
    >
        <p className="text-sm font-medium text-sky-ink-2 leading-relaxed max-w-xs">
            You called off the transaction before it landed. No gems were charged — your gold stays right where it was.
        </p>

        {orderId && <OrderRef orderId={orderId} />}

        <div className="flex flex-col gap-2.5 w-full">
            <PrimaryCta onClick={onRetry}>
                <RotateCcw className="w-4 h-4" /> Try Again
            </PrimaryCta>
            <SecondaryCta onClick={onDashboard}>
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </SecondaryCta>
        </div>
    </ResultShell>
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
