import { Outlet } from "react-router";
import MentorHeader from "./MentorHeader";
import { WalletProvider } from "../context/WalletContext";

const MentorLayout: React.FC = () => {
    return (
        <WalletProvider>
            <div className="min-h-screen flex flex-col">
                <MentorHeader />
                <main className="admin-content flex-1 w-full p-6 sm:p-8 bg-gray-50 dark:bg-gray-900 bg-dot-pattern-light">
                    <Outlet />
                </main>
            </div>
        </WalletProvider>
    );
};

export default MentorLayout;
