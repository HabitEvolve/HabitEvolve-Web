import { createPortal } from "react-dom";
import { useSidebar } from "../context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen z-[99999] bg-black/50 backdrop-blur-sm lg:hidden"
      onClick={toggleMobileSidebar}
    />,
    document.body
  );
};

export default Backdrop;
