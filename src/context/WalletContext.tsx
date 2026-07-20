import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import mentorWalletApi from '../api/mentorWalletApi';
import type { MentorWalletDto } from '../types/mentorWallet.types';

// ── Context shape ─────────────────────────────────────────────────────────────
interface WalletContextType {
    wallet: MentorWalletDto | null;
    loading: boolean;
    /** Re-fetches the wallet from the BE — call this after any action that changes the
     * gems balance (top-up, purchase) so every consumer (header + wallet page) stays
     * in sync instead of each holding its own stale local fetch. */
    refetchWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
// Mounted once around the Mentor layout — MentorHeader's gem chip and the Wallet
// page both read from this single fetch instead of racing their own independent ones.
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<MentorWalletDto | null>(null);
    const [loading, setLoading] = useState(true);

    const refetchWallet = useCallback(async () => {
        setLoading(true);
        try {
            const res = await mentorWalletApi.getWallet();
            if (res.success && res.data) setWallet(res.data);
        } catch {
            // session may have expired — balance just stays whatever it last was
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refetchWallet(); }, [refetchWallet]);

    return (
        <WalletContext.Provider value={{ wallet, loading, refetchWallet }}>
            {children}
        </WalletContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useWallet = (): WalletContextType => {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within <WalletProvider>');
    return ctx;
};
