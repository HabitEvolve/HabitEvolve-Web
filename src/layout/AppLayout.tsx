import { useEffect } from "react";
import { SidebarProvider } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useTheme } from "../context/ThemeContext";

const LayoutContent: React.FC = () => {
  const { theme } = useTheme();

  // TODO(sky-pastel-dark-mode): same fix as MentorLayout, same reason —
  // sky-admin-bg is a light-only slate wash with no dark-mode tokens yet, so
  // it would show a bright slate strip inside an otherwise-dark app. Force
  // <html> out of dark mode while the Admin portal is mounted; the saved
  // `theme` preference itself is untouched, so it still applies correctly
  // wherever Night-Pastel tokens land first. AppHeader's toggle is disabled
  // to match. Practically, with both AppLayout and MentorLayout now doing
  // this, dark mode is app-wide inert until that work happens.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    return () => {
      if (theme === "dark") root.classList.add("dark");
    };
  }, [theme]);

  return (
    <div className="h-screen flex overflow-hidden app-bg">
      {/* Grain overlay — fixed, non-interactive, sits above the mesh and below
          all content (design-system §2). One instance per layout. */}
      <div className="app-grain" aria-hidden="true" />

      {/*
       * AppSidebar is fixed on mobile (slides in/out via isMobileOpen) and
       * relative/in-flow on desktop (collapses via isExpanded). No wrapper
       * div needed — the sidebar manages its own width and position.
       */}
      <AppSidebar />

      {/* Content column — takes remaining flex space */}
      <div className="flex-1 h-screen flex flex-col min-w-0 relative z-1">
        <AppHeader />
        {/* Transparent so the app-bg mesh + grain show through; the page's own
            glass cards provide all surface. No opaque wash here (§7: "Không
            nền trắng phẳng trơn"). */}
        <div className="admin-content flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </div>

      {/* Portal-based dark overlay for mobile sidebar — mounts to document.body */}
      <Backdrop />
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
