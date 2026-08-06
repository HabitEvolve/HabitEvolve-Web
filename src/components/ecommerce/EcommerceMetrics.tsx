import { Users, PackageOpen, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import SkyCard from "../ui/card/SkyCard";

// Sky-Pastel stat tile. Deltas carry a direction glyph and a sign as well as a
// hue, so the trend never rests on colour alone (§4) — and "down" is rose, not
// a red-vs-green pair: teal is reserved for success/completion state.
type Metric = {
  label: string;
  value: string;
  Icon: LucideIcon;
  delta: string;
  dir: "up" | "down";
};

const METRICS: Metric[] = [
  { label: "Customers", value: "3,782", Icon: Users, delta: "11.01%", dir: "up" },
  { label: "Orders", value: "5,359", Icon: PackageOpen, delta: "9.05%", dir: "down" },
];

export default function EcommerceMetrics() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 sky-stagger">
      {METRICS.map(({ label, value, Icon, delta, dir }) => {
        const up = dir === "up";
        const DeltaIcon = up ? TrendingUp : TrendingDown;
        return (
          <SkyCard key={label} variant="admin" className="sky-lift p-5 md:p-6">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-sky-chip bg-sky-deep/10 ring-1 ring-sky-deep/18 text-sky-deep">
              <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </div>

            <div className="relative flex items-end justify-between mt-5 gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">
                  {label}
                </span>
                <h4 className="mt-1.5 font-display text-sky-h2 font-semibold text-sky-ink tabular-nums leading-none">
                  {value}
                </h4>
              </div>

              <span
                className={`inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full ring-1 text-xs font-semibold tabular-nums ${
                  up
                    ? "bg-sky-teal-bg text-sky-teal ring-sky-teal/26"
                    : "bg-sky-rose/12 text-sky-rose-deep ring-sky-rose/26"
                }`}
              >
                <DeltaIcon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
                {up ? "+" : "−"}{delta}
              </span>
            </div>
          </SkyCard>
        );
      })}
    </div>
  );
}
