import { useState } from "react";
import { Menu, MoreHorizontal, Search } from "lucide-react";
import { ThemeToggleButton } from "../common/ThemeToggleButton";
import NotificationDropdown from "./NotificationDropdown";
import UserDropdown from "./UserDropdown";

// Define the interface for the props
interface HeaderProps {
  onClick?: () => void; // Optional function that takes no arguments and returns void
  onToggle: () => void;
}

// One glass-chip recipe for every icon control in the bar, so the row reads as a
// single control group rather than four unrelated buttons.
const chipCls =
  "flex items-center justify-center w-10 h-10 rounded-sky-chip text-sky-ink-2 transition-colors hover:bg-white/70 hover:text-sky-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45";

const Header: React.FC<HeaderProps> = ({ onClick, onToggle }) => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  return (
    <header className="sticky top-0 flex w-full bg-white/62 backdrop-blur-xl border-white/60 z-99999 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-white/60 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button className={`${chipCls} lg:hidden`} onClick={onToggle} aria-label="Toggle sidebar">
            <Menu className="w-5 h-5 shrink-0" aria-hidden="true" />
          </button>
          <button
            onClick={onClick}
            aria-label="Collapse sidebar"
            className={`hidden ${chipCls} z-99999 lg:flex lg:h-11 lg:w-11 lg:bg-white/55 lg:ring-1 lg:ring-white/80`}
          >
            <Menu className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>

          <button
            onClick={toggleApplicationMenu}
            aria-label="More"
            aria-expanded={isApplicationMenuOpen}
            className={`${chipCls} z-99999 lg:hidden`}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" aria-hidden="true" />
          </button>

          <div className="hidden lg:block">
            <form action="https://formbold.com/s/unique_form_id" method="POST">
              <div className="relative">
                {/* The glyph is the affordance; it stays quiet ink so the typed
                    query is the only thing with weight in the field. */}
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-ink-3">
                  <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  placeholder="Search or type command..."
                  className="h-11 w-full rounded-sky-chip bg-white/70 ring-1 ring-white/85 py-2.5 pl-11 pr-14 text-sm font-medium text-sky-ink shadow-sky-chip transition-shadow placeholder:text-sky-ink-3 focus:outline-none focus:ring-2 focus:ring-sky-deep/45 xl:w-[430px]"
                />

                <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center rounded-sky-sm bg-white/60 ring-1 ring-white/80 px-2 py-1 text-[10px] font-semibold -tracking-[0.2px] text-sky-ink-3">
                  ⌘
                </span>
              </div>
            </form>
          </div>
        </div>
        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"
            } items-center justify-between w-full gap-4 px-5 py-4 lg:flex bg-white/45 border-t border-white/60 lg:justify-end lg:px-0 lg:bg-transparent lg:border-t-0`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          {/* <!-- User Area --> */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
