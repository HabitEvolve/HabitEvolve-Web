import { ChevronLeft, ChevronRight } from "lucide-react";

// ── PAGINATION ────────────────────────────────────────────────────────────────
// Shared server-side pagination control — page-number buttons with ellipsis
// collapsing, matching the neo-brutalism button language used across Admin
// tables (hard offset shadow, press-down hover, clear disabled states).
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Defaults to currentPage > 1 when omitted. */
    hasPreviousPage?: boolean;
    /** Defaults to currentPage < totalPages when omitted. */
    hasNextPage?: boolean;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    hasPreviousPage,
    hasNextPage,
}: PaginationProps) {
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
        "w-9 h-9 flex items-center justify-center rounded-xl border-2 border-black font-bold text-sm " +
        "shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] " +
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
        "disabled:shadow-[2px_2px_0_0_#1A1D20] transition-all";

    return (
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-t-2 border-gray-100 dark:border-gray-700">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!canGoPrev}
                aria-label="Previous page"
                className={`${btnBase} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200`}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {pages.map((page, idx) =>
                page === "..." ? (
                    <span key={`dots-${idx}`} className="text-gray-400 font-bold px-1 text-sm select-none">
                        …
                    </span>
                ) : (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        aria-label={`Page ${page}`}
                        aria-current={page === currentPage ? "page" : undefined}
                        className={`${btnBase} ${page === currentPage
                            ? "bg-orange-300 text-gray-900"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                            }`}
                    >
                        {page}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!canGoNext}
                aria-label="Next page"
                className={`${btnBase} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200`}
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
