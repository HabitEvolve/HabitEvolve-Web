/**
 * GPS / Step-counter proof metadata parsing.
 *
 * BE stores `Proof.Metadata` as a free-form JSON *string* — built by the
 * Mobile app as `{gps: GpsProofMetadata}` or `{steps: StepProofMetadata}`
 * (see HabitEvolve-Mobile/src/screens/quests/CheckInScreen.tsx). GPS/
 * STEP_COUNTER proofs carry no `mediaUrls`, so this is the only evidence
 * available for a Mentor/Admin to review — it must be parsed and shown,
 * not left as a blank "no media" placeholder.
 */

export interface GpsProofMetadata {
    distanceMeters: number;
    distanceKm: number;
    durationSec: number;
    avgSpeedKmh: number;
    pointCount: number;
    startedAt: string | null;
    capturedAt: string;
}

export interface StepProofMetadata {
    steps: number;
    durationSec: number;
    avgStepsPerMin: number;
    startedAt: string | null;
    capturedAt: string;
}

export interface ParsedProofMetadata {
    gps?: GpsProofMetadata;
    steps?: StepProofMetadata;
}

export function parseProofMetadata(raw: string | null | undefined): ParsedProofMetadata | null {
    if (!raw) return null;
    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && (obj.gps || obj.steps)) {
            return obj as ParsedProofMetadata;
        }
        return null;
    } catch {
        return null;
    }
}

/** `125` → `"2:05"`, `3725` → `"1:02:05"`. */
export function formatDuration(totalSec: number): string {
    const s = Math.max(0, Math.round(totalSec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
