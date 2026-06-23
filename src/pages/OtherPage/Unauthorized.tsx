import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';

export default function Unauthorized() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
            <div className="w-full max-w-md text-center">
                {/* Neo-brutalism card */}
                <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#FEE2E2] p-10">
                    <div className="text-8xl font-black text-black mb-4 tracking-tighter">
                        403
                    </div>
                    <h1 className="text-2xl font-black text-black mb-3 uppercase tracking-tight">
                        Access Denied
                    </h1>
                    <p className="text-gray-700 font-medium mb-8">
                        You don't have permission to view this page. Make sure you're logged in with the correct account.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link
                            to="/home"
                            className="w-full py-3 px-6 bg-[#A7F3D0] border-2 border-black rounded-xl font-bold text-black shadow-[3px_3px_0_0_#1A1D20] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all"
                        >
                            Go to Dashboard
                        </Link>
                        <button
                            onClick={logout}
                            className="w-full py-3 px-6 bg-white border-2 border-black rounded-xl font-bold text-black shadow-[3px_3px_0_0_#1A1D20] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
