import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 flex w-full bg-white border-b-4 border-black shadow-[0px_4px_0px_0px_#1A1D20] z-40">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">

        {/* ── PRIMARY ROW ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between w-full gap-2 px-4 py-3 lg:px-0 lg:py-4">

          {/* LEFT: sidebar toggle + mobile logo + desktop search */}
          <div className="flex items-center gap-3">


            {/* Mobile-only logo */}
            <Link to="/" className="lg:hidden">
              <img className="dark:hidden" src="./images/logo/logo.svg" alt="Logo" />
              <img className="hidden dark:block" src="./images/logo/logo-dark.svg" alt="Logo" />
            </Link>

            {/* Desktop search bar */}
            <div className="hidden lg:block">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="currentColor" />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search or type command..."
                  className="h-11 w-[340px] xl:w-[430px] rounded-full border-4 border-black bg-white pl-12 pr-16 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-lg border-2 border-black bg-gray-50 px-2 py-1 text-xs font-black text-gray-700 shadow-[2px_2px_0_0_#1A1D20] select-none">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* RIGHT: mobile three-dots + desktop notification+user */}
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
              aria-label="Open menu"
              className="lg:hidden flex items-center justify-center w-10 h-10 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2.2" />
                <circle cx="12" cy="12" r="2.2" />
                <circle cx="19" cy="12" r="2.2" />
              </svg>
            </button>

            {/* Desktop: always-visible notification + user */}
            <div className="hidden lg:flex items-center gap-3">
              <NotificationDropdown />
              <UserDropdown />
            </div>
          </div>
        </div>

        {/* ── MOBILE EXPANDED SECTION ──────────────────────────────── */}
        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"
            } lg:hidden items-center gap-3 w-full px-4 pb-3 border-t-2 border-dashed border-gray-200 pt-3`}
        >
          <NotificationDropdown />
          <UserDropdown />
        </div>

      </div>
    </header>
  );
};

export default AppHeader;
