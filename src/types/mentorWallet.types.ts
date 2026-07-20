// Complete wallet types with full SePay payment fields.
// The existing mentor.types.ts has an incomplete TopUpGemsResultDto (missing paymentFormFields).
// Import from this file for anything related to the top-up payment flow.

export type WalletPaymentMethod = 'SEPAY' | 'DEMO';
export type GemTransactionType = 'TOPUP' | 'PURCHASE' | 'REFUND';
export type GemTransactionStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface MentorWalletDto {
    userId: number;
    gemsBalance: number;
    vndPerGem: number;   // 1 Gem = X VND; system-configured default = 20
    updatedAt?: string;
}

export interface GemTransactionDto {
    gemTransactionId: number;
    userId: number;
    type: GemTransactionType;
    gemAmount: number;
    status: GemTransactionStatus;
    balanceAfter: number;
    reference?: string;       // "GEM{id:D8}" (e.g. "GEM00000022") for top-up; "SUB-{subscriptionId}" for purchase
    description?: string;
    amountVnd: number;        // VND charged; 0 for PURCHASE transactions
    paymentMethod?: WalletPaymentMethod;
    createdAt: string;
    completedAt?: string;
}

export interface TopUpGemsRequest {
    mentorUserId: number;
    gemAmount: number;
    paymentMethod?: WalletPaymentMethod; // defaults to "DEMO" on BE
}

export interface TopUpGemsResultDto {
    transaction: GemTransactionDto;
    gemsBalance: number;
    // false = DEMO / gems added immediately; true = SePay pending, gems not yet added
    requiresPayment: boolean;
    // Populated only when requiresPayment=true: SePay checkout endpoint (form POST target)
    checkoutUrl?: string;
    // All form fields to POST to checkoutUrl, including pre-computed HMAC signature
    paymentFormFields?: Record<string, string>;
    // "GEM{transactionId:D8}" (e.g. "GEM00000022") — echoed back by SePay's IPN/webhook to identify the transaction
    orderInvoiceNumber?: string;
}

export interface TopUpConfirmResultDto extends TopUpGemsResultDto {}
