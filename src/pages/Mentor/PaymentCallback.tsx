import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { CheckCircle2, XCircle, Undo2, ArrowLeft, RotateCcw } from 'lucide-react';
import mentorWalletApi from '../../api/mentorWalletApi';
import {
    ResultShell, PrimaryCta, OrderRef, BalancePanel, VerifyingView, PAYMENT_ACCENTS,
} from '../../components/mentor/PaymentResultChrome';

type PaymentState = 'verifying' | 'success' | 'error' | 'cancel';

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [state, setState] = useState<PaymentState>('verifying');
    const [gemsBalance, setGemsBalance] = useState<number | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);

    useEffect(() => {
        const payment = searchParams.get('payment');
        const order = searchParams.get('orderId');
        setOrderId(order);

        if (payment === 'success') {
            // SePay webhook already processed the payment server-side.
            // Fetch wallet to get the updated balance for display only.
            mentorWalletApi.getWallet()
                .then((res) => {
                    if (res.success && res.data) setGemsBalance(res.data.gemsBalance);
                })
                .catch(() => {/* session may have expired — balance will just be null */})
                .finally(() => setState('success'));
        } else if (payment === 'error') {
            setState('error');
        } else {
            // 'cancel' or any unexpected param
            setState('cancel');
        }
    }, [searchParams]);

    const goToWallet = () => navigate('/mentor/subscription', { replace: true });

    if (state === 'verifying') {
        return (
            <VerifyingView
                title="Payment Verification"
                subtitle="Verifying payment…"
                hint="Checking your gem balance."
            />
        );
    }

    if (state === 'success') {
        return (
            // Teal — success is never green (§4).
            <ResultShell
                rail={PAYMENT_ACCENTS.success.rail}
                accent={PAYMENT_ACCENTS.success.chip}
                icon={<CheckCircle2 className="w-9 h-9" />}
                kicker="Payment Confirmed"
                title="Gems Added!"
            >
                {gemsBalance !== null && <BalancePanel label="New Balance" value={gemsBalance} />}

                {orderId && <OrderRef orderId={orderId} label="Reference" />}

                <p className="text-sm font-medium text-sky-ink-2 leading-relaxed max-w-xs">
                    Your payment was successful and gems have been credited to your wallet.
                </p>

                <PrimaryCta onClick={goToWallet}>
                    <ArrowLeft className="w-4 h-4" /> Back to Wallet
                </PrimaryCta>
            </ResultShell>
        );
    }

    if (state === 'error') {
        return (
            <ResultShell
                rail={PAYMENT_ACCENTS.failed.rail}
                accent={PAYMENT_ACCENTS.failed.chip}
                icon={<XCircle className="w-9 h-9" />}
                kicker="Payment Declined"
                title="Payment Failed"
            >
                {orderId && <OrderRef orderId={orderId} label="Reference" />}

                <p className="text-sm font-medium text-sky-ink-2 leading-relaxed max-w-xs">
                    Your payment could not be completed. No gems were deducted.
                    Please try again or contact support if the issue persists.
                </p>

                <PrimaryCta onClick={goToWallet}>
                    <RotateCcw className="w-4 h-4" /> Try Again
                </PrimaryCta>
            </ResultShell>
        );
    }

    // cancel state — peach, not rose: the user chose this, it isn't a failure.
    return (
        <ResultShell
            rail={PAYMENT_ACCENTS.cancelled.rail}
            accent={PAYMENT_ACCENTS.cancelled.chip}
            icon={<Undo2 className="w-9 h-9" />}
            kicker="Transaction Cancelled"
            title="Payment Cancelled"
        >
            <p className="text-sm font-medium text-sky-ink-2 leading-relaxed max-w-xs">
                You cancelled the payment. No charges were made and your gem balance is unchanged.
            </p>

            <PrimaryCta onClick={goToWallet}>
                <ArrowLeft className="w-4 h-4" /> Back to Wallet
            </PrimaryCta>
        </ResultShell>
    );
}
