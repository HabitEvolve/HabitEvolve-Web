import { SidebarProvider } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  return (
    <div className="h-screen flex overflow-hidden">
      {/*
       * AppSidebar is fixed on mobile (slides in/out via isMobileOpen) and
       * relative/in-flow on desktop (collapses via isExpanded). No wrapper
       * div needed — the sidebar manages its own width and position.
       */}
      <AppSidebar />

      {/* Content column — takes remaining flex space */}
      <div className="flex-1 h-screen flex flex-col min-w-0">
        <AppHeader />
        <div className="admin-content flex-1 overflow-y-auto p-8 bg-dot-grid-light dark:bg-dot-grid-dark">
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
