import { ChevronLeft, ChevronRight } from "lucide-react";

// ── SKY PAGINATION ────────────────────────────────────────────────────────────
// The single pagination control for the whole app. It began as a fork of the
// neo-brutalism Pagination.tsx so migrated pages could adopt it one at a time;
// every consumer is on it now and the original has been deleted.
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

    // tabular-nums keeps the row from reflowing as the digit widths change
    // between pages — a 1px jitter on every click reads as sloppy.
    const btnBase =
        "w-9 h-9 flex items-center justify-center rounded-sky-chip font-display font-semibold text-sm " +
        "tabular-nums transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent";
    const idle = "text-sky-ink-2 hover:bg-white/70 hover:text-sky-deep";

    return (
        <div className="flex items-center justify-center gap-1.5 px-6 py-4 border-t border-white/60">
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!canGoPrev}
                aria-label="Previous page"
                className={`${btnBase} ${idle}`}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {pages.map((page, idx) =>
                page === "..." ? (
                    <span key={`dots-${idx}`} className="text-sky-ink-3 px-1 text-sm select-none">
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
                            ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                            : idle
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
                className={`${btnBase} ${idle}`}
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
