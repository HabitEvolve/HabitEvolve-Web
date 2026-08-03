import { Outlet } from "react-router";
import MentorHeader from "./MentorHeader";
import { WalletProvider } from "../context/WalletContext";
import { LiveCallProvider } from "../context/LiveCallContext";
import LiveCallFloatingBar from "./LiveCallFloatingBar";

const MentorLayout: React.FC = () => {
    return (
        <WalletProvider>
            <LiveCallProvider>
                <div className="min-h-screen flex flex-col">
                    <MentorHeader />
                    <main className="admin-content flex-1 w-full p-6 sm:p-8 bg-gray-50 dark:bg-gray-900 bg-dot-pattern-light">
                        <Outlet />
                    </main>
                </div>
                <LiveCallFloatingBar />
            </LiveCallProvider>
        </WalletProvider>
    );
};

export default MentorLayout;
