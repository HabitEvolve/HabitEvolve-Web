import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Loader2 } from "lucide-react";
import type { LiveChallengeDto } from "../../types/partyCall.types";

/**
 * "Đấu Trường Trực Tiếp" — badge gợi ý AI cho 1 bằng chứng challenge. AI (IAiVerificationService,
 * face-match theo PortraitUrl + action) KHÔNG BAO GIỜ tự duyệt/từ chối — chỉ hiển thị gợi ý cho
 * mentor cân nhắc trước khi bấm Approve/Reject. Dùng chung giữa LiveChallengeSession (đang duyệt)
 * và LiveArenaHistory (xem lại sau buổi call).
 *
 * State is never color-only: mỗi trạng thái luôn kèm icon riêng, không chỉ đổi màu.
 */
export function AiEvidenceBadge({ evidence }: { evidence: LiveChallengeDto["evidence"] }) {
    if (!evidence) return null;
    const map: Record<string, { Icon: typeof ShieldCheck; cls: string; label: string }> = {
        Approved: { Icon: ShieldCheck, cls: "text-sky-teal bg-sky-teal/12", label: "AI: looks genuine" },
        Suspicious: { Icon: ShieldAlert, cls: "text-sky-peach-deep bg-sky-peach/14", label: "AI: uncertain" },
        Rejected: { Icon: ShieldX, cls: "text-sky-rose-deep bg-sky-rose/14", label: "AI: mismatch" },
        AiChecking: { Icon: Loader2, cls: "text-sky-ink-3 bg-sky-ink/6", label: "AI: checking…" },
        NotUsed: { Icon: ShieldQuestion, cls: "text-sky-ink-3 bg-sky-ink/6", label: "AI: not used" },
    };
    const cfg = map[evidence.aiStatus] ?? map.NotUsed;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${cfg.cls}`} title={evidence.aiReasoning ?? undefined}>
            <cfg.Icon className={`w-3 h-3 shrink-0 ${evidence.aiStatus === "AiChecking" ? "animate-spin" : ""}`} />
            {cfg.label}
            {evidence.aiConfidence != null && ` (${Math.round(evidence.aiConfidence * 100)}%)`}
        </span>
    );
}
