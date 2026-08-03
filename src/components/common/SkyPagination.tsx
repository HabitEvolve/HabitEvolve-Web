import { ChevronLeft, ChevronRight } from "lucide-react";

// ── SKY PAGINATION ────────────────────────────────────────────────────────────
// Sky-Pastel fork of Pagination.tsx. That component is still imported by 4
// unmigrated Admin pages (AdminCombatItemManagement, AdminPartyManagement,
// AdminSystemJobsPage, UserDetail) — restyling it in place would have
// reskinned pagination controls on pages otherwise still neo-brutalism.
// This is the shared control for every page migrated from here on; swap a
// page's import from "./Pagination" to "./SkyPagination" as it's migrated.
interface SkyPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Defaults to currentPage > 1 when omitted. */
    hasPreviousPage?: boolean;
    /** Defaults to currentPage < totalPages when omitted. */
    hasNextPage?: boolean;
}

export default function SkyPagination({
    currentPage,
    totalPages,
    onPageChange,
    hasPreviousPage,
    hasNextPage,
}: SkyPaginationProps) {
    if (totalPages <= 1) return null;

    const canGoPrev = hasPreviousPage ?? currentPage > 1;
    const canGoNext = hasNextPage ?? currentPage < totalPages;

    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push("...");
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    const btnBase =
        "w-9 h-9 flex items-center justify-center rounded-sky-chip font-semibold text-sm transition-colors " +
        "disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-200">
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!canGoPrev}
                aria-label="Previous page"
                className={`${btnBase} text-sky-ink-2 hover:bg-sky-3/20`}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {pages.map((page, idx) =>
                page === "..." ? (
                    <span key={`dots-${idx}`} className="text-sky-ink-3 font-semibold px-1 text-sm select-none">
                        …
                    </span>
                ) : (
                    <button
                        type="button"
                        key={page}
                        onClick={() => onPageChange(page)}
                        aria-label={`Page ${page}`}
                        aria-current={page === currentPage ? "page" : undefined}
                        className={`${btnBase} ${page === currentPage
                            ? "bg-sky-deep text-white"
                            : "text-sky-ink-2 hover:bg-sky-3/20"
                            }`}
                    >
                        {page}
                    </button>
                )
            )}

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!canGoNext}
                aria-label="Next page"
                className={`${btnBase} text-sky-ink-2 hover:bg-sky-3/20`}
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
