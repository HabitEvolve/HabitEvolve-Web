import { useEffect } from "react";
import { Outlet } from "react-router";
import MentorHeader from "./MentorHeader";
import { WalletProvider } from "../context/WalletContext";
import { LiveCallProvider } from "../context/LiveCallContext";
import LiveCallFloatingBar from "./LiveCallFloatingBar";
import { useTheme } from "../context/ThemeContext";

const MentorLayout: React.FC = () => {
    const { theme } = useTheme();

    // TODO(sky-pastel-dark-mode): Sky-Pastel has no "Night-Pastel" tokens yet
    // (Mobile's source layer is light-only — see DESIGN.md §1). Force <html>
    // out of dark mode for as long as the Mentor portal is mounted, regardless
    // of the user's saved preference, so sky-mesh-bg/sky-glass never sit next
    // to a dark:-toggled header. This only flips the DOM class, not the saved
    // `theme` value (localStorage / ThemeContext state) — Admin still resumes
    // the user's real preference the instant they navigate away. Remove this
    // once Night-Pastel tokens exist; also re-enable the toggle in
    // MentorHeader.tsx's ThemeToggleInline at that point.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark");
        return () => {
            if (theme === "dark") {
                root.classList.add("dark");
            }
        };
    }, [theme]);

    return (
        <WalletProvider>
            <LiveCallProvider>
                <div className="min-h-screen flex flex-col app-bg">
                    {/* Grain overlay — fixed, non-interactive (design-system §2) */}
                    <div className="app-grain" aria-hidden="true" />
                    <MentorHeader />
                    {/* Transparent: the mesh + grain above supply the backdrop,
                        page-level glass cards supply the surface. */}
                    <main className="admin-content flex-1 w-full p-6 sm:p-8 relative z-1">
                        <Outlet />
                    </main>
                </div>
                <LiveCallFloatingBar />
            </LiveCallProvider>
        </WalletProvider>
    );
};

export default MentorLayout;
