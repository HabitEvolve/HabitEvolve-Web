import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../../api/axiosClient";
import type { GlobalSearchItemDto, GlobalSearchItemType, GlobalSearchResultDto } from "../../types/adminSearch.types";

// ── CONFIG ──────────────────────────────────────────────────────────────────
const DEBOUNCE_MS = 400;
const PER_CATEGORY_LIMIT = 5; // khớp `limit` mặc định của BE (GET /admin/global-search?q&limit)

type GroupKey = 'users' | 'parties' | 'goals' | 'questTemplates' | 'bossTemplates' | 'packages';

// Metadata hiển thị cho từng nhóm — đúng 6 key mà GlobalSearchResultDto trả về.
const GROUP_META: Record<GroupKey, { label: string; icon: string }> = {
    users: { label: "Users", icon: "👤" },
    parties: { label: "Parties", icon: "🎉" },
    goals: { label: "Goals", icon: "🎯" },
    questTemplates: { label: "Quest Templates", icon: "📜" },
    bossTemplates: { label: "Boss Templates", icon: "⚔️" },
    packages: { label: "Packages", icon: "💳" },
};
const GROUP_ORDER = Object.keys(GROUP_META) as GroupKey[];

// `item.type` từ BE là singular kebab-case ("boss-template", "quest-template"...)
// — map riêng sang route trang quản lý tương ứng khi bấm vào 1 kết quả.
// "party" chưa có trang quản lý riêng ở Admin (party do Mentor quản lý).
const TYPE_ROUTE: Record<GlobalSearchItemType, string | null> = {
    user: "/user-management",
    party: null,
    goal: "/goal-engine",
    "quest-template": "/quest-library",
    "boss-template": "/boss-management",
    package: "/subscription-packages",
};

const STATUS_STYLES: Record<string, string> = {
    Active: "bg-green-200 text-green-900",
    Inactive: "bg-gray-200 text-gray-700",
    Banned: "bg-red-200 text-red-900",
    Suspended: "bg-amber-200 text-amber-900",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

export interface AdminGlobalSearchHandle {
    focus(): void;
}

// ── ITEM ROW ─────────────────────────────────────────────────────────────────
function SearchResultItem({ item, onSelect }: { item: GlobalSearchItemDto; onSelect(item: GlobalSearchItemDto): void }) {
    const statusClass = item.status ? STATUS_STYLES[item.status] ?? "bg-gray-200 text-gray-700" : null;
    return (
        <li>
            <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-2 border-transparent rounded-lg
                    hover:border-black hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
            >
                <div className="min-w-0 flex-1">
                    <p className="font-black text-sm text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                    {item.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
                    )}
                </div>
                {item.status && (
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border border-black ${statusClass}`}>
                        {item.status}
                    </span>
                )}
            </button>
        </li>
    );
}

interface AdminGlobalSearchProps {
    /** Override hành vi điều hướng mặc định (map ở TYPE_ROUTE). */
    onSelectResult?(item: GlobalSearchItemDto): void;
    /** Hiện badge phím tắt (vd "⌘K") ở góc phải khi input đang rỗng. */
    shortcutHint?: string;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
/**
 * Global search cho Admin Header. Gọi `GET /api/admin/global-search?q&limit`
 * (debounce 400ms), nhóm kết quả theo 6 category BE trả sẵn, và điều hướng
 * đến trang quản lý tương ứng khi bấm vào 1 kết quả.
 */
const AdminGlobalSearch = forwardRef<AdminGlobalSearchHandle, AdminGlobalSearchProps>(function AdminGlobalSearch(
    { onSelectResult, shortcutHint },
    ref,
) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<GlobalSearchResultDto | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const debouncedQuery = useDebouncedValue(searchQuery, DEBOUNCE_MS);
    const navigate = useNavigate();

    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }));

    // Gọi API khi debouncedQuery đổi. Query rỗng được chặn ở đây (không gọi
    // API) — trường hợp gõ rồi xoá về rỗng cũng đã được xử lý tức thời trong
    // handleInputChange bên dưới nên UI không phải chờ hết debounce mới đóng.
    useEffect(() => {
        const term = debouncedQuery.trim();
        if (!term) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        // Huỷ request cũ nếu còn đang bay — tránh race condition khi kết quả
        // của một từ khoá cũ trả về SAU kết quả của từ khoá mới hơn.
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsSearching(true);
        axiosClient
            .get<{ success: boolean; data: GlobalSearchResultDto }>("/admin/global-search", {
                params: { q: term, limit: PER_CATEGORY_LIMIT },
                signal: controller.signal,
            })
            .then((res) => {
                if (res.data?.success) {
                    setSearchResults(res.data.data);
                    setIsOpen(true);
                }
            })
            .catch((err: any) => {
                // Request bị huỷ bởi AbortController (từ khoá mới hơn đã tới) — bỏ qua, không phải lỗi thật.
                if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
                setSearchResults({ query: term, totalResults: 0, users: [], parties: [], goals: [], questTemplates: [], bossTemplates: [], packages: [] });
                setIsOpen(true);
            })
            .finally(() => setIsSearching(false));

        return () => controller.abort();
    }, [debouncedQuery]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (!value.trim()) {
            setSearchResults(null);
            setIsOpen(false);
        } else {
            setIsOpen(true);
        }
    };

    const closeDropdown = useCallback(() => setIsOpen(false), []);

    // Click ra ngoài / nhấn Esc → đóng dropdown.
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) closeDropdown();
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeDropdown();
                inputRef.current?.blur();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, closeDropdown]);

    const handleSelect = (item: GlobalSearchItemDto) => {
        closeDropdown();
        if (onSelectResult) {
            onSelectResult(item);
            return;
        }
        const route = TYPE_ROUTE[item.type];
        if (route) navigate(route);
    };

    const groupsWithData: GroupKey[] = searchResults
        ? GROUP_ORDER.filter((key) => (searchResults[key]?.length ?? 0) > 0)
        : [];
    const hasSearchedEmpty = !!searchResults && searchResults.totalResults === 0;

    return (
        <div ref={containerRef} className="relative w-full max-w-md">
            {/* ── SEARCH INPUT ── */}
            <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-black dark:text-white">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="currentColor" />
                    </svg>
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={() => searchResults && setIsOpen(true)}
                    placeholder="Tìm user, party, quest, boss, package..."
                    className="w-full h-11 border-4 border-black dark:border-gray-600 bg-white dark:bg-gray-800
                        pl-10 pr-14 text-sm font-bold text-gray-900 dark:text-gray-100
                        placeholder:font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500
                        shadow-[4px_4px_0_0_#1A1D20] focus:shadow-[4px_4px_0_0_#1A1D20]
                        focus:bg-yellow-100 dark:focus:bg-yellow-900/10 focus:outline-none transition-colors"
                />
                {isSearching ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-black dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    shortcutHint && !searchQuery && (
                        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-lg border-2 border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-black text-gray-700 dark:text-gray-300 shadow-[2px_2px_0_0_#1A1D20] select-none pointer-events-none">
                            {shortcutHint}
                        </kbd>
                    )
                )}
            </div>

            {/* ── RESULTS DROPDOWN ── */}
            {isOpen && searchResults && (
                <div
                    className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto
                        border-4 border-black dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800
                        shadow-[6px_6px_0_0_#1A1D20]
                        [&::-webkit-scrollbar]:w-3
                        [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-900
                        [&::-webkit-scrollbar-thumb]:bg-black dark:[&::-webkit-scrollbar-thumb]:bg-gray-500
                        [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-white dark:[&::-webkit-scrollbar-thumb]:border-gray-800"
                >
                    {hasSearchedEmpty ? (
                        <div className="px-5 py-8 text-center">
                            <p className="text-3xl mb-2">🤷</p>
                            <p className="font-black text-gray-800 dark:text-gray-100">
                                Không tìm thấy kết quả nào cho "{searchResults.query}"
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Thử từ khoá khác xem, biết đâu vận đỏ hơn.</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            {groupsWithData.map((key) => (
                                <div key={key} className="mb-1 last:mb-0">
                                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {GROUP_META[key].icon} {GROUP_META[key].label}
                                    </p>
                                    <ul>
                                        {searchResults[key].map((item) => (
                                            <SearchResultItem key={`${key}-${item.id}`} item={item} onSelect={handleSelect} />
                                        ))}
                                    </ul>
                                    {key !== groupsWithData[groupsWithData.length - 1] && (
                                        <div className="my-1.5 border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default AdminGlobalSearch;
