import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isMobileOpen } = useSidebar();

  return (
    <div className="h-screen flex">
      {/* Sidebar - Fixed height, no scrolling */}
      <div className="h-screen overflow-hidden flex-shrink-0">
        <AppSidebar />
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </div>

      {/* Portal-based mobile backdrop — mounts to document.body */}
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
