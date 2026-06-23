import { SidebarProvider } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import MentorSidebar from "./MentorSidebar";

const LayoutContent: React.FC = () => {
    return (
        <div className="h-screen flex overflow-hidden">
            {/*
             * MentorSidebar is fixed on mobile (slides in/out via isMobileOpen)
             * and relative/in-flow on desktop (collapses via isExpanded).
             */}
            <MentorSidebar />

            {/* Content column */}
            <div className="flex-1 h-screen flex flex-col min-w-0">
                <AppHeader />
                <div className="admin-content flex-1 overflow-y-auto p-8 bg-dot-grid-light dark:bg-dot-grid-dark">
                    <Outlet />
                </div>
            </div>

            {/* Portal-based dark overlay for mobile sidebar */}
            <Backdrop />
        </div>
    );
};

const MentorLayout: React.FC = () => {
    return (
        <SidebarProvider>
            <LayoutContent />
        </SidebarProvider>
    );
};

export default MentorLayout;
