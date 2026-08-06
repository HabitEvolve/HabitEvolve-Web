import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { Moon, Swords, Zap, Skull, Film, type LucideIcon } from "lucide-react";
import type { DailyBossAnimationFrameDto } from "../../types/adminDailyBoss.types";

// ── CONFIG ──────────────────────────────────────────────────────────────────
// 10fps ≈ 100ms/frame — đúng tốc độ khung hình pixel-art boss theo yêu cầu.
const FRAME_DURATION_MS = 100;

// Sky-Pastel tokens (see DESIGN.md) — the neo-brutalism system this widget
// used to mirror ("Boss Raid, Wallet...") has itself been retired in favor
// of Sky-Pastel across those same screens, so this preview frame follows.
const EASE_EXPO = "ease-[cubic-bezier(0.16,1,0.3,1)]";

// BE không enforce enum cho animationState (free string, uppercase) — 4 state
// này chỉ là convention hiện tại của game design, các label lạ vẫn render
// được (fallback badge trung tính bên dưới).
const KNOWN_STATES = ["IDLE", "ATTACK", "HIT", "DEFEAT"] as const;

// Emoji are retired as icons (§4): they render at the mercy of the host font,
// break alignment against Onest, and never match the lucide vocabulary the rest
// of the console speaks. The tints are a taxonomy of what the boss is *doing*,
// not a verdict — so teal (success) stays out of it entirely: calm=deep,
// striking=peach, taking damage=damage-orange, dead=rose.
const STATE_META: Record<string, { label: string; Icon: LucideIcon; accent: string }> = {
    IDLE: { label: "Idle", Icon: Moon, accent: "bg-sky-deep/12 text-sky-deep ring-sky-deep/22" },
    ATTACK: { label: "Attack", Icon: Swords, accent: "bg-sky-peach/20 text-sky-peach-deep ring-sky-peach/34" },
    HIT: { label: "Hit", Icon: Zap, accent: "bg-sky-dmg/16 text-sky-dmg-deep ring-sky-dmg/30" },
    DEFEAT: { label: "Defeat", Icon: Skull, accent: "bg-sky-rose/14 text-sky-rose-deep ring-sky-rose/28" },
};
const FALLBACK_META = { label: "", Icon: Film, accent: "bg-sky-ink/8 text-sky-ink-2 ring-sky-ink/14" };

type StateMotion = { animate: Record<string, number[] | number>; transition: Record<string, unknown> };

// Mỗi state có một "diễn xuất" riêng cho khung ảnh (không liên quan tới việc
// đổi frame bên trong sprite) — animation phụ do Framer Motion điều khiển
// qua React state (activeState đổi hiếm khi, không tốn hiệu năng).
const STATE_MOTION: Record<string, StateMotion> = {
    IDLE: { animate: { y: [0, -8, 0], rotate: 0 }, transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } },
    ATTACK: { animate: { x: [0, -18, 24, 0] }, transition: { duration: 0.4, ease: "easeOut" } },
    HIT: { animate: { x: [0, -10, 10, -8, 8, 0] }, transition: { duration: 0.35, ease: "easeInOut" } },
    DEFEAT: { animate: { y: [0, 24], opacity: [1, 0.45], rotate: 10 }, transition: { duration: 0.6, ease: "easeIn" } },
};
const FALLBACK_MOTION: StateMotion = { animate: { scale: [1, 1.03, 1] }, transition: { duration: 1, repeat: Infinity, ease: "easeInOut" } };

/**
 * Nhóm mảng frame phẳng từ API thành object { [animationState]: string[] },
 * mỗi mảng URL đã được sort theo `frameOrder` tăng dần.
 */
export function groupFramesByState(rawFrames: DailyBossAnimationFrameDto[] | undefined | null): Record<string, string[]> {
    const grouped: Record<string, DailyBossAnimationFrameDto[]> = {};
    for (const frame of rawFrames ?? []) {
        const state = frame.animationState;
        if (!grouped[state]) grouped[state] = [];
        grouped[state].push(frame);
    }
    const result: Record<string, string[]> = {};
    for (const state of Object.keys(grouped)) {
        result[state] = grouped[state]
            .slice()
            .sort((a, b) => a.frameOrder - b.frameOrder)
            .map((f) => f.imageUrl);
    }
    return result;
}

interface DailyBossAnimationProps {
    frames: DailyBossAnimationFrameDto[];
    initialState?: string;
    /** Hide the built-in state-switch buttons (e.g. when the caller drives state externally). */
    hideControls?: boolean;
}

/**
 * DailyBossAnimation
 *
 * Sprite-sheet boss animation chạy bằng vòng lặp `useAnimationFrame` của
 * Framer Motion thay vì `setInterval` + `setState`. Lý do: `setState` mỗi
 * 100ms sẽ khiến React re-render toàn bộ component (và có thể cả cây con),
 * gây layout thrashing. `useAnimationFrame` chạy đồng bộ với rAF của trình
 * duyệt và callback của nó KHÔNG làm re-render — ta tận dụng điều này bằng
 * cách gán thẳng `imgRef.current.src` (thao tác DOM trực tiếp), bỏ qua
 * hoàn toàn reconciliation của React cho việc đổi frame.
 *
 * `useMotionValue` chỉ đóng vai trò "biến đếm" frame index sống ngoài chu kỳ
 * render của React (đọc/ghi qua `.get()`/`.set()` không kích hoạt re-render),
 * dùng để biết frame tiếp theo cần lấy từ mảng URL nào.
 */
export default function DailyBossAnimation({ frames, initialState = "IDLE", hideControls = false }: DailyBossAnimationProps) {
    const framesByState = useMemo(() => groupFramesByState(frames), [frames]);
    const availableStates = useMemo(() => {
        const known = KNOWN_STATES.filter((s) => framesByState[s]?.length);
        const extra = Object.keys(framesByState).filter((s) => !KNOWN_STATES.includes(s as (typeof KNOWN_STATES)[number]));
        return [...known, ...extra];
    }, [framesByState]);

    const [activeState, setActiveState] = useState(
        framesByState[initialState]?.length ? initialState : availableStates[0]
    );

    // Nếu prop `frames` đổi (fetch lại từ server) và state đang chọn không còn
    // tồn tại nữa, rơi về state khả dụng đầu tiên thay vì đứng khung trắng.
    useEffect(() => {
        if (!framesByState[activeState]?.length && availableStates.length > 0) {
            setActiveState(availableStates[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [framesByState]);

    const imgRef = useRef<HTMLImageElement | null>(null);
    // frameIndex sống ngoài render cycle — an toàn để đọc/ghi mỗi tick 60fps.
    const frameIndex = useMotionValue(0);
    // Gom dồn thời gian trôi qua giữa các tick rAF để throttle xuống ~10fps
    // (rAF chạy ~60fps, nhưng sprite chỉ cần đổi mỗi 100ms).
    const elapsedRef = useRef(0);

    // 1) PRELOAD toàn bộ ảnh ngay khi mount/khi frames đổi, tránh chớp trắng
    // khi người dùng đổi state lần đầu (ảnh chưa nằm trong cache trình duyệt).
    useEffect(() => {
        const allUrls = Object.values(framesByState).flat();
        const preloaded = allUrls.map((url) => {
            const img = new Image();
            img.src = url;
            return img;
        });
        return () => {
            preloaded.forEach((img) => { img.src = ""; });
        };
    }, [framesByState]);

    // 2) Khi state đổi (IDLE -> ATTACK...): reset về frame đầu tiên ngay lập
    // tức. Đây là lần DUY NHẤT setState/effect can thiệp vào việc chọn ảnh —
    // vì đổi state là hành động rời rạc (user bấm nút / server báo), không
    // phải animation liên tục nên không ảnh hưởng hiệu năng.
    useEffect(() => {
        frameIndex.set(0);
        elapsedRef.current = 0;
        const firstFrame = framesByState[activeState]?.[0];
        if (imgRef.current && firstFrame) {
            imgRef.current.src = firstFrame;
        }
    }, [activeState, framesByState, frameIndex]);

    // 3) VÒNG LẶP ANIMATION CHÍNH — chạy mỗi frame của trình duyệt (rAF).
    // `delta` là số ms trôi qua kể từ tick trước, dùng để tự quản lý tốc độ
    // phát (10fps) mà không cần setInterval. Callback này không setState nên
    // không trigger re-render — chỉ mutate DOM (imgRef.current.src) trực tiếp.
    useAnimationFrame((_time, delta) => {
        const urls = framesByState[activeState];
        if (!urls || urls.length === 0) return;

        elapsedRef.current += delta;
        if (elapsedRef.current < FRAME_DURATION_MS) return;
        elapsedRef.current = 0;

        const nextIndex = (frameIndex.get() + 1) % urls.length;
        frameIndex.set(nextIndex);
        if (imgRef.current) {
            imgRef.current.src = urls[nextIndex];
        }
    });

    const meta = STATE_META[activeState] ?? { ...FALLBACK_META, label: activeState ?? "" };
    const motionProps = STATE_MOTION[activeState] ?? FALLBACK_MOTION;
    const hasFrames = !!framesByState[activeState]?.length;
    const MetaIcon = meta.Icon;

    return (
        <div className="inline-flex flex-col items-center gap-4">
            {/* ── SÂN KHẤU BOSS ──
                A lit diorama, not a flat swatch: a vertical sky wash for depth, a
                soft bloom behind the sprite so it reads as spotlit, and a ground
                ellipse so the boss looks planted instead of floating in a box. */}
            <div className="relative w-64 h-64 flex items-center justify-center overflow-hidden rounded-sky-card shadow-sky-glass bg-linear-to-b from-sky-3 to-sky-4 ring-1 ring-inset ring-white/60">
                <span aria-hidden="true" className="absolute -top-10 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-white/55 blur-3xl" />
                <span aria-hidden="true" className="absolute bottom-7 left-1/2 -translate-x-1/2 w-36 h-4 rounded-[100%] bg-sky-ink/12 blur-md" />

                {activeState && (
                    // Badge trạng thái: luôn có icon + label chữ, KHÔNG chỉ dựa vào màu
                    // (đúng nguyên tắc "state is never color-only" của DESIGN.md).
                    <span
                        className={`absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1
                            rounded-full ring-1 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-[0.08em] ${meta.accent}`}
                    >
                        <MetaIcon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
                        {meta.label}
                    </span>
                )}

                {hasFrames ? (
                    // `key={activeState}` buộc remount motion.img mỗi lần đổi state để
                    // animation phụ (bob/lunge/shake/fall) luôn chạy lại từ đầu sạch sẽ;
                    // ảnh không bị chớp vì đã preload ở bước (1) nên nằm sẵn trong cache.
                    <motion.img
                        key={activeState}
                        ref={imgRef}
                        alt={`Daily Boss - ${meta.label}`}
                        className="relative w-full h-full object-contain select-none pointer-events-none [image-rendering:pixelated]"
                        draggable={false}
                        animate={motionProps.animate}
                        transition={motionProps.transition}
                    />
                ) : (
                    <span className="relative flex flex-col items-center gap-2 px-6 text-center">
                        <Film className="w-7 h-7 text-sky-ink-3" strokeWidth={2} aria-hidden="true" />
                        <span className="text-sm font-semibold text-sky-ink-2 leading-snug">
                            Chưa có frame nào — hãy upload sprite sheet
                        </span>
                    </span>
                )}
            </div>

            {/* ── HÀNG NÚT TEST STATE ── */}
            {!hideControls && availableStates.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                    {availableStates.map((state) => {
                        const isActive = state === activeState;
                        const stateMeta = STATE_META[state] ?? { ...FALLBACK_META, label: state };
                        const StateIcon = stateMeta.Icon;
                        return (
                            <button
                                key={state}
                                type="button"
                                onClick={() => setActiveState(state)}
                                aria-pressed={isActive}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-sky-chip
                                    font-semibold text-sm transition-all duration-150 ${EASE_EXPO}
                                    ${isActive
                                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25"
                                        : "bg-white/62 ring-1 ring-white/80 text-sky-ink-2 hover:bg-white/80 hover:text-sky-ink motion-safe:hover:-translate-y-px active:translate-y-0"}`}
                            >
                                <StateIcon
                                    className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-sky-ink-3"}`}
                                    strokeWidth={2.3}
                                    aria-hidden="true"
                                />
                                {stateMeta.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
