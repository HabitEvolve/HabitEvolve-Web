import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import mentorWalletApi from '../../api/mentorWalletApi';

type PaymentState = 'verifying' | 'success' | 'error' | 'cancel';

const Spinner = ({ size = 20 }: { size?: number }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

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
            <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
                <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#A7F3D0] px-14 py-12 flex flex-col items-center gap-5">
                    <Spinner size={44} />
                    <p className="font-black text-black text-lg uppercase tracking-tight">
                        Verifying payment...
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Checking your gem balance</p>
                </div>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#D1FAE5] p-10 flex flex-col items-center gap-5 text-center">
                        <div className="w-20 h-20 flex items-center justify-center text-5xl border-4 border-black rounded-2xl bg-emerald-400 shadow-[4px_4px_0_0_#1A1D20]">
                            💎
                        </div>
                        <h1 className="text-3xl font-black text-black">
                            Gems Added!
                        </h1>
                        {gemsBalance !== null && (
                            <div className="bg-white border-4 border-black rounded-2xl px-8 py-4 shadow-[4px_4px_0_0_#1A1D20]">
                                <p className="text-sm font-bold text-gray-500 mb-1">New Balance</p>
                                <p className="text-4xl font-black text-amber-700">
                                    {gemsBalance.toLocaleString()} 💎
                                </p>
                            </div>
                        )}
                        {orderId && (
                            <p className="text-xs text-gray-500 font-medium">
                                Reference: <span className="font-black text-gray-700">{orderId}</span>
                            </p>
                        )}
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                            Your payment was successful and gems have been credited to your wallet.
                        </p>
                        <button
                            onClick={goToWallet}
                            className="w-full py-3 border-4 border-black rounded-full font-black text-base bg-emerald-500 text-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        >
                            Back to Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#FEE2E2] p-10 flex flex-col items-center gap-5 text-center">
                        <div className="w-20 h-20 flex items-center justify-center text-5xl border-4 border-black rounded-2xl bg-red-400 shadow-[4px_4px_0_0_#1A1D20]">
                            ✕
                        </div>
                        <h1 className="text-3xl font-black text-black">Payment Failed</h1>
                        {orderId && (
                            <p className="text-xs text-gray-500 font-medium">
                                Reference: <span className="font-black text-gray-700">{orderId}</span>
                            </p>
                        )}
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                            Your payment could not be completed. No gems were deducted.
                            Please try again or contact support if the issue persists.
                        </p>
                        <button
                            onClick={goToWallet}
                            className="w-full py-3 border-4 border-black rounded-full font-black text-base bg-red-400 shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // cancel state
    return (
        <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#FEF9C3] p-10 flex flex-col items-center gap-5 text-center">
                    <div className="w-20 h-20 flex items-center justify-center text-5xl border-4 border-black rounded-2xl bg-amber-300 shadow-[4px_4px_0_0_#1A1D20]">
                        ↩
                    </div>
                    <h1 className="text-3xl font-black text-black">Payment Cancelled</h1>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                        You cancelled the payment. No charges were made and your gem balance is unchanged.
                    </p>
                    <button
                        onClick={goToWallet}
                        className="w-full py-3 border-4 border-black rounded-full font-black text-base bg-amber-400 shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                    >
                        Back to Wallet
                    </button>
                </div>
            </div>
        </div>
    );
}
