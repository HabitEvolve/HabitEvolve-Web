import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import SkyCard from "../ui/card/SkyCard";
import CountryMap from "./CountryMap";

// Share-of-total rows. Each bar states its own percentage in text next to the
// track, so the ranking survives without relying on bar length or hue — and the
// fill stays on the cool operational tone, since a customer count is a quantity
// rather than a verdict (teal is reserved for success state, §4).
const COUNTRIES = [
  { name: "USA", flag: "./images/country/country-01.svg", customers: "2,379", pct: 79 },
  { name: "France", flag: "./images/country/country-02.svg", customers: "589", pct: 23 },
];

const menuItemCls =
  "flex w-full font-medium text-left text-sky-ink-2 rounded-sky-chip hover:bg-white/70 hover:text-sky-ink";

export default function DemographicCard() {
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  return (
    <SkyCard variant="admin" className="p-5 sm:p-6">
      <div className="relative flex justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">
            Demographic
          </p>
          <h3 className="mt-1 font-display text-sky-h3 font-semibold text-sky-ink leading-tight">
            Customers by country
          </h3>
        </div>
        <div className="relative inline-block shrink-0">
          <button
            className="dropdown-toggle grid place-items-center w-9 h-9 rounded-sky-chip text-sky-ink-3 hover:bg-white/70 hover:text-sky-ink active:scale-95 transition-all duration-150"
            onClick={toggleDropdown}
            aria-label="Card options"
            aria-expanded={isOpen}
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
            <DropdownItem onItemClick={closeDropdown} className={menuItemCls}>
              View More
            </DropdownItem>
            <DropdownItem onItemClick={closeDropdown} className={menuItemCls}>
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* The map sits in its own inset well so the vector art reads as a plate
          inside the card rather than floating loose on the glass. */}
      <div className="relative px-4 py-6 my-6 overflow-hidden rounded-sky-card bg-white/55 ring-1 ring-white/78 sm:px-6">
        <div
          id="mapOne"
          className="mapOne map-btn -mx-4 -my-6 h-[212px] w-[252px] 2xsm:w-[307px] xsm:w-[358px] sm:-mx-6 md:w-[668px] lg:w-[634px] xl:w-[393px] 2xl:w-[554px]"
        >
          <CountryMap />
        </div>
      </div>

      <div className="relative space-y-4">
        {COUNTRIES.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid place-items-center w-9 h-9 shrink-0 overflow-hidden rounded-full bg-white/70 ring-1 ring-white/85">
                <img src={c.flag} alt="" className="w-full h-full object-cover" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-sky-ink truncate">{c.name}</p>
                <span className="block text-xs font-medium text-sky-ink-3 tabular-nums">
                  {c.customers} customers
                </span>
              </div>
            </div>

            <div className="flex w-full max-w-[150px] items-center gap-3 shrink-0">
              <div className="relative block h-2 w-full max-w-25 rounded-full bg-sky-ink/10 overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-sky-deep-lo to-sky-deep"
                  style={{ width: `${c.pct}%` }}
                />
              </div>
              <p className="w-9 text-right font-display text-sm font-semibold text-sky-ink tabular-nums">
                {c.pct}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </SkyCard>
  );
}
