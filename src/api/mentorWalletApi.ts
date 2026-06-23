import axiosClient from './axiosClient';
import { ApiResponse } from '../types/api.types';
import type {
    MentorWalletDto,
    GemTransactionDto,
    TopUpGemsRequest,
    TopUpGemsResultDto,
} from '../types/mentorWallet.types';

const mid = (): number => {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : 0;
};

/**
 * Submit a hidden form POST to the SePay checkout endpoint.
 * SePay does NOT accept a plain GET redirect — it requires a form submission
 * with all signed fields. After submission the browser navigates to SePay.
 * The BE pre-computes the HMAC signature inside paymentFormFields, so we just
 * copy every field into hidden inputs and submit.
 */
export const submitSepayForm = (
    checkoutUrl: string,
    formFields: Record<string, string>
): void => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkoutUrl;
    form.style.display = 'none';

    Object.entries(formFields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    // Browser navigates away — the form element is never cleaned up, but that's fine
};

const mentorWalletApi = {
    /** GET /api/mentor/wallet — current balance and VND conversion rate */
    getWallet: async (): Promise<ApiResponse<MentorWalletDto>> => {
        const r = await axiosClient.get<ApiResponse<MentorWalletDto>>(
            '/mentor/wallet', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    /**
     * POST /api/mentor/wallet/topup
     * DEMO: gems added immediately, requiresPayment=false.
     * SEPAY: transaction created as Pending, requiresPayment=true,
     *        checkoutUrl + paymentFormFields returned — call submitSepayForm() next.
     */
    topUpGems: async (payload: TopUpGemsRequest): Promise<ApiResponse<TopUpGemsResultDto>> => {
        const r = await axiosClient.post<ApiResponse<TopUpGemsResultDto>>(
            '/mentor/wallet/topup', payload
        );
        return r.data;
    },

    /** GET /api/mentor/wallet/transactions — full transaction history */
    getTransactions: async (): Promise<ApiResponse<GemTransactionDto[]>> => {
        const r = await axiosClient.get<ApiResponse<GemTransactionDto[]>>(
            '/mentor/wallet/transactions', { params: { mentorUserId: mid() } }
        );
        return r.data;
    },

    /**
     * POST /api/mentor/wallet/topups/{transactionId}/confirm-payment
     * Dev-only: simulates the SePay webhook locally to complete a Pending transaction
     * without going through the real payment gateway.
     */
    confirmTopUp: async (transactionId: number): Promise<ApiResponse<TopUpGemsResultDto>> => {
        const r = await axiosClient.post<ApiResponse<TopUpGemsResultDto>>(
            `/mentor/wallet/topups/${transactionId}/confirm-payment`,
            null,
            { params: { mentorUserId: mid() } }
        );
        return r.data;
    },
};

export default mentorWalletApi;
