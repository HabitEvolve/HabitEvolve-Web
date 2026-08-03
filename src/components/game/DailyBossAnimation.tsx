import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
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

const STATE_META: Record<string, { label: string; icon: string; accent: string }> = {
    IDLE: { label: "Idle", icon: "💤", accent: "bg-brand-100 text-brand-800" },
    ATTACK: { label: "Attack", icon: "⚔️", accent: "bg-warning-100 text-warning-800" },
    HIT: { label: "Hit", icon: "💥", accent: "bg-error-100 text-error-800" },
    DEFEAT: { label: "Defeat", icon: "☠️", accent: "bg-gray-200 text-gray-700" },
};
const FALLBACK_META = { label: "", icon: "🎞️", accent: "bg-gray-200 text-gray-700" };

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

    return (
        <div className="inline-flex flex-col items-center gap-4">
            {/* ── KHUNG BOSS (Sky-Pastel: viền mảnh + đổ bóng mềm, ink-blue) ── */}
            <div className="relative w-64 h-64 flex items-center justify-center overflow-hidden rounded-sky-card shadow-sky-glass bg-warning-100">
                {activeState && (
                    // Badge trạng thái: luôn có icon + label chữ, KHÔNG chỉ dựa vào màu
                    // (đúng nguyên tắc "state is never color-only" của DESIGN.md).
                    <span
                        className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5
                            rounded-full text-xs font-semibold ${meta.accent}`}
                    >
                        {meta.icon} {meta.label}
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
                        className="w-full h-full object-contain select-none pointer-events-none"
                        draggable={false}
                        animate={motionProps.animate}
                        transition={motionProps.transition}
                    />
                ) : (
                    <span className="text-sm font-semibold text-sky-ink/60 px-4 text-center">
                        Chưa có frame nào — hãy upload sprite sheet
                    </span>
                )}
            </div>

            {/* ── HÀNG NÚT TEST STATE ── */}
            {!hideControls && availableStates.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                    {availableStates.map((state) => {
                        const isActive = state === activeState;
                        const stateMeta = STATE_META[state] ?? { ...FALLBACK_META, label: state };
                        return (
                            <button
                                key={state}
                                type="button"
                                onClick={() => setActiveState(state)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-sky-chip
                                    font-semibold text-sm transition-all duration-150 ${EASE_EXPO}
                                    ${isActive
                                        ? "bg-warning-400 text-warning-950 shadow-sky-chip"
                                        : "bg-white text-sky-ink-2 border border-sky-surf-border hover:border-warning-400/60"}`}
                            >
                                {stateMeta.icon} {stateMeta.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
