import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { SKY, skyChartBase } from "../../utils/skyChart";

// The three footer figures differ only by direction, so one component carries
// both the glyph and the hue: teal for up, rose for down. Never green.
const Stat = ({ label, value, dir }: { label: string; value: string; dir: "up" | "down" }) => (
  <div>
    <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3 sm:text-[11px]">
      {label}
    </p>
    <p className="flex items-center justify-center gap-1 font-display text-base font-semibold text-sky-ink tabular-nums sm:text-lg">
      {value}
      {dir === "up" ? (
        <ArrowUp className="w-4 h-4 text-sky-teal" aria-hidden="true" />
      ) : (
        <ArrowDown className="w-4 h-4 text-sky-rose-deep" aria-hidden="true" />
      )}
    </p>
  </div>
);

export default function MonthlyTarget() {
  const series = [75.55];
  // Radial track/fill read off the tokens; the big centre number uses the display
  // face so it matches every other headline numeral in the app.
  const options: ApexOptions = {
    ...skyChartBase,
    colors: [SKY.deep],
    chart: {
      ...skyChartBase.chart,
      type: "radialBar",
      height: 330,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "80%",
        },
        track: {
          background: SKY.sky3,
          strokeWidth: "100%",
          margin: 5, // margin is in pixels
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontFamily: "Bricolage Grotesque, sans-serif",
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: SKY.ink,
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: [SKY.deep],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  const menuItem =
    "flex w-full font-medium text-left text-sky-ink-2 rounded-sky-chip hover:bg-white/70 hover:text-sky-ink transition-colors";
  return (
    <div className="rounded-sky-card sky-glass-admin overflow-hidden">
      <div className="relative px-5 pt-5 pb-11 sm:px-6 sm:pt-6">
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-sky-ink">
              Monthly Target
            </h3>
            <p className="mt-1 text-sm text-sky-ink-2">
              Target you’ve set for each month
            </p>
          </div>
          <div className="relative inline-block">
            <button
              type="button"
              aria-label="Chart options"
              className="dropdown-toggle inline-grid place-items-center w-8 h-8 rounded-sky-chip text-sky-ink-3 hover:bg-white/70 hover:text-sky-ink transition-colors"
              onClick={toggleDropdown}
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={closeDropdown}
              className="w-40 p-2"
            >
              <DropdownItem onItemClick={closeDropdown} className={menuItem}>
                View More
              </DropdownItem>
              <DropdownItem onItemClick={closeDropdown} className={menuItem}>
                Delete
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
        <div className="relative">
          <div className="max-h-[330px]" id="chartDarkStyle">
            <Chart
              options={options}
              series={series}
              type="radialBar"
              height={330}
            />
          </div>

          {/* Ahead-of-target delta: arrow + sign + teal, three cues rather than one. */}
          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] inline-flex items-center gap-1 rounded-full bg-sky-teal-bg px-3 py-1 text-xs font-semibold text-sky-teal tabular-nums">
            <ArrowUp className="w-3 h-3" aria-hidden="true" />+10%
          </span>
        </div>
        <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-sky-ink-2">
          You earn $3287 today, it's higher than last month. Keep up your good
          work!
        </p>
      </div>

      <div className="relative flex items-center justify-center gap-5 border-t border-white/60 bg-white/35 px-6 py-3.5 sm:gap-8 sm:py-5">
        <Stat label="Target" value="$20K" dir="down" />
        <div className="w-px h-7 bg-sky-ink/12"></div>
        <Stat label="Revenue" value="$20K" dir="up" />
        <div className="w-px h-7 bg-sky-ink/12"></div>
        <Stat label="Today" value="$20K" dir="up" />
      </div>
    </div>
  );
}
