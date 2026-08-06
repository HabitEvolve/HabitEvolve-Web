/**
 * Sky Pastel chart theme — the single source of truth for every ApexChart in the app.
 *
 * Charts were the last place raw hex codes survived, and they were also the last
 * place green survived. Everything here is derived from the same token values as
 * `src/index.css`, so a palette change happens in one place instead of eight.
 *
 * Colour law, restated for series data:
 *   deep    → the primary/neutral measure (users, activity, "the main line")
 *   peach   → reward & warm attention (gold, streaks, XP, pending)
 *   teal    → success / completion — never green
 *   violet  → epic / mentor / premium
 *   rose    → destructive or failure only
 */

// ── RAW VALUES ────────────────────────────────────────────────────────────────
// Mirrors of the --color-sky-* custom properties. ApexCharts renders into an SVG
// it owns and cannot read Tailwind utility classes, so these must be literals.
export const SKY = {
  deep: "#3D6DA6",
  deepLo: "#5C8CC4",
  sky1: "#A9C7E8",
  sky2: "#C0D8F1",
  sky3: "#D7EAF8",
  peach: "#F0AC72",
  peachDeep: "#A85F1F",
  teal: "#2E9C8E",
  tealBg: "#D6EDE9",
  violet: "#7C6AC7",
  violetDeep: "#5B4699",
  rose: "#C4708A",
  roseDeep: "#A34E6C",
  ink: "#24344D",
  ink2: "rgba(36, 52, 77, 0.62)",
  ink3: "rgba(36, 52, 77, 0.38)",
  grid: "rgba(36, 52, 77, 0.10)",
  /** Marker/label stroke — the only neutral in the set. */
  white: "#FFFFFF",
} as const;

/** Default multi-series order: cool primary first, then warm, then epic. */
export const SKY_SERIES = [SKY.deep, SKY.peach, SKY.violet, SKY.teal, SKY.sky1, SKY.rose] as const;

/** Semantic single-series picks, so call sites read as intent rather than colour. */
export const SKY_SEMANTIC = {
  primary: SKY.deep,
  reward: SKY.peach,
  success: SKY.teal,
  epic: SKY.violet,
  danger: SKY.rose,
  muted: SKY.sky1,
} as const;

/**
 * Shared Apex options — spread this first, then override per chart.
 * Typed loosely on purpose: `ApexOptions` is a deep partial and importing it here
 * would force every consumer to reconcile its optional-property variance.
 */
export const skyChartBase = {
  chart: {
    fontFamily: "Onest, system-ui, sans-serif",
    toolbar: { show: false },
    // Navy drop shadow, never black — matches the card elevation rule.
    dropShadow: { enabled: false },
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor: SKY.grid,
    strokeDashArray: 3,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 4, right: 4, top: -6 },
  },
  legend: {
    fontFamily: "Onest, system-ui, sans-serif",
    fontWeight: 500,
    labels: { colors: SKY.ink2 },
    markers: { size: 6, strokeWidth: 0 },
    itemMargin: { horizontal: 10 },
  },
  tooltip: {
    // Onest body, navy ink, no hard black.
    style: { fontFamily: "Onest, system-ui, sans-serif", fontSize: "12px" },
    theme: "light" as const,
  },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: {
        colors: SKY.ink3,
        fontSize: "11px",
        fontFamily: "Onest, system-ui, sans-serif",
        fontWeight: 500,
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: SKY.ink3,
        fontSize: "11px",
        fontFamily: "Onest, system-ui, sans-serif",
        fontWeight: 500,
      },
    },
  },
  states: {
    hover: { filter: { type: "lighten", value: 0.06 } },
    active: { filter: { type: "darken", value: 0.06 } },
  },
};

/** Soft top-down gradient fill for area charts, tinted by the series colour. */
export const skyAreaFill = {
  type: "gradient" as const,
  gradient: {
    shadeIntensity: 1,
    opacityFrom: 0.34,
    opacityTo: 0.02,
    stops: [0, 92],
  },
};

/** Rounded, breathable bars — matches the pill geometry used across the UI. */
export const skyBarPlotOptions = {
  bar: { borderRadius: 6, columnWidth: "48%", borderRadiusApplication: "end" as const },
};
