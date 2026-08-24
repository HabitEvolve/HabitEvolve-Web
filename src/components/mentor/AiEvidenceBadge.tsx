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
        <div className="flex flex-col gap-1 min-w-0">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold w-fit ${cfg.cls}`}>
                <cfg.Icon className={`w-3 h-3 shrink-0 ${evidence.aiStatus === "AiChecking" ? "animate-spin" : ""}`} />
                {cfg.label}
                {evidence.aiConfidence != null && ` (${Math.round(evidence.aiConfidence * 100)}%)`}
            </span>
            {/* Lý do AI luôn hiện thành chữ — trước đây chỉ nằm trong title/tooltip hover nên mentor dễ bỏ sót,
                nhất là khi cần hiểu vì sao verdict là "mismatch"/"uncertain" để quyết định Approve/Reject. */}
            {evidence.aiReasoning && (
                <p className="text-[11px] font-medium text-sky-ink-3 leading-snug wrap-break-word">{evidence.aiReasoning}</p>
            )}
        </div>
    );
}
