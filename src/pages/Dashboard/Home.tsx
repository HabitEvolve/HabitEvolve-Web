import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="HabitEvolve Admin Dashboard"
        description="HabitEvolve Admin Dashboard - Mentoring & Learning Management"
      />

      {/* Metric Cards */}
      <section className="grid grid-cols-4 gap-6 mb-8">
        {/* Total Mentors */}
        <div className="bg-[#E6FAF3] p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z"></path>
              </svg>
            </div>
            <span className="font-bold text-gray-700">Total Mentors</span>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900 mb-1">4,520</div>
            <div className="text-xs font-semibold text-emerald-500 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" fillRule="evenodd"></path>
              </svg>
              +12.5% since last month
            </div>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-[#E6FAF3] p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z"></path>
              </svg>
            </div>
            <span className="font-bold text-gray-700">Total Students</span>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900 mb-1">32,150</div>
            <div className="text-xs font-semibold text-emerald-500 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" fillRule="evenodd"></path>
              </svg>
              +8.1% since last month
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#E6FAF3] p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                <path clipRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" fillRule="evenodd"></path>
              </svg>
            </div>
            <span className="font-bold text-gray-700">Total Revenue</span>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900 mb-1">$125,000</div>
            <div className="text-xs font-semibold text-emerald-500 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" fillRule="evenodd"></path>
              </svg>
              +4.2% since last month
            </div>
          </div>
        </div>

        {/* Active Courses */}
        <div className="bg-[#E6FAF3] p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
              </svg>
            </div>
            <span className="font-bold text-gray-700">Active Courses</span>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900 mb-1">85</div>
            <div className="text-xs font-semibold text-red-500 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v3.586l-4.293-4.293a1 1 0 00-1.414 0L8 10.586 3.707 6.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 10.414 14.586 14H12z" fillRule="evenodd"></path>
              </svg>
              -2.1% since last month
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="grid grid-cols-3 gap-6 mb-8">
        {/* Revenue Analytics */}
        <div className="col-span-2 bg-[#E6FAF3] p-8 rounded-[2rem] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-800">Revenue Analytics</h3>
            <div className="text-sm text-gray-500">Last 12 months</div>
          </div>

          {/* Legend */}
          <div className="flex space-x-6 mb-6">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-sm bg-orange-400 mr-2"></span>
              <span className="text-xs font-medium text-gray-600">Revenue (2024)</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-sm bg-blue-300 mr-2"></span>
              <span className="text-xs font-medium text-gray-600">Revenue (2023)</span>
            </div>
          </div>

          <div className="relative h-[280px]">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 240">
              {/* Grid Lines */}
              <line stroke="#f0f0f0" x1="0" x2="800" y1="0" y2="0"></line>
              <line stroke="#f0f0f0" x1="0" x2="800" y1="40" y2="40"></line>
              <line stroke="#f0f0f0" x1="0" x2="800" y1="80" y2="80"></line>
              <line stroke="#f0f0f0" x1="0" x2="800" y1="120" y2="120"></line>
              <line stroke="#f0f0f0" x1="0" x2="800" y1="160" y2="160"></line>
              <line stroke="#f0f0f0" x1="0" x2="800" y1="200" y2="200"></line>

              {/* 2023 Line (Blue) */}
              <path
                d="M0,200 L66,185 L132,180 L198,185 L264,150 L330,152 L396,165 L462,175 L528,170 L594,140 L660,150 L726,125"
                fill="none"
                stroke="#93c5fd"
                strokeWidth="3"
              ></path>

              {/* 2024 Line (Orange) */}
              <path
                d="M0,180 L66,165 L132,145 L198,150 L264,115 L330,113 L396,90 L462,85 L528,75 L594,45 L660,40 L726,15"
                fill="none"
                stroke="#f7a561"
                strokeWidth="3"
              ></path>

              {/* Area for 2024 */}
              <path
                d="M0,180 L66,165 L132,145 L198,150 L264,115 L330,113 L396,90 L462,85 L528,75 L594,45 L660,40 L726,15 V240 H0 Z"
                fill="url(#orange-gradient)"
                fillOpacity="0.1"
              ></path>

              <defs>
                <linearGradient id="orange-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f7a561"></stop>
                  <stop offset="100%" stopColor="white"></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>

        {/* Visitor Analytics */}
        <div className="bg-[#E6FAF3] p-8 rounded-[2rem] shadow-sm flex flex-col items-center">
          <h3 className="text-xl font-bold text-gray-800 w-full mb-10 text-left">Visitor Analytics</h3>

          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Donut Chart */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Desktop (65%) */}
              <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#3b82f6" strokeDasharray="65 35" strokeDashoffset="0" strokeWidth="4.5"></circle>

              {/* Mobile (25%) */}
              <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#93c5fd" strokeDasharray="25 75" strokeDashoffset="-65" strokeWidth="4.5"></circle>

              {/* Tablet (10%) */}
              <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#cbd5e1" strokeDasharray="10 90" strokeDashoffset="-90" strokeWidth="4.5"></circle>
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Total Visitors</span>
              <span className="text-lg font-black text-gray-900">45,600</span>
            </div>

            {/* Labels */}
            <div className="absolute -top-4 -left-8 text-xs font-bold text-gray-600">
              Tablet: <span className="text-gray-400">10%</span>
            </div>
            <div className="absolute top-1/2 -left-12 -translate-y-1/2 text-xs font-bold text-gray-600">
              Mobile:<br />
              <span className="text-gray-400 text-sm">25%</span>
            </div>
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-xs font-bold text-gray-600">
              Desktop:<br />
              <span className="text-gray-400 text-sm">65%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activities Table */}
      <section className="bg-[#E6FAF3] rounded-[2rem] shadow-sm overflow-hidden flex-grow">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Recent Activities</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                <th className="px-8 py-4">Activity</th>
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
              <tr>
                <td className="px-8 py-5">New Mentor Registration: 'Sarah Jones'</td>
                <td className="px-8 py-5 text-gray-500">User: Sarah J.</td>
                <td className="px-8 py-5 text-gray-500">2024-05-20 10:30 AM</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">Pending</span>
                </td>
              </tr>

              <tr>
                <td className="px-8 py-5">Course Created: 'Advanced Python'</td>
                <td className="px-8 py-5 text-gray-500">David L.</td>
                <td className="px-8 py-5 text-gray-500">2024-05-20 09:45 AM</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-medium">Active</span>
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5">Student Enrollment: 'John Doe' in 'Web Dev'</td>
                <td className="px-8 py-5 text-gray-500">John D.</td>
                <td className="px-8 py-5 text-gray-500">2024-05-19 03:15 PM</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">Completed</span>
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5">System Update</td>
                <td className="px-8 py-5 text-gray-500">Admin User</td>
                <td className="px-8 py-5 text-gray-500">2024-05-18 01:00 AM</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">Done</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
