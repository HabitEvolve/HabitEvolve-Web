import { Outlet } from "react-router";
import MentorHeader from "./MentorHeader";

const MentorLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <MentorHeader />
            <main className="admin-content flex-1 w-full p-6 sm:p-8 bg-gray-50 dark:bg-gray-900 bg-dot-pattern-light">
                <Outlet />
            </main>
        </div>
    );
};

export default MentorLayout;
