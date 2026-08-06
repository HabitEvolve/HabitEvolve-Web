import { createPortal } from "react-dom";
import { useSidebar } from "../context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return createPortal(
    // Same scrim every modal in the app uses — navy at 45%, never black.
    // A true black veil turns the pastel field grey underneath it; the abyss
    // tint keeps the sidebar reading as sky even while dimmed.
    <div
      className="fixed inset-0 w-screen h-screen z-[99999] bg-sky-abyss/45 backdrop-blur-md lg:hidden"
      onClick={toggleMobileSidebar}
    />,
    document.body
  );
};

export default Backdrop;
