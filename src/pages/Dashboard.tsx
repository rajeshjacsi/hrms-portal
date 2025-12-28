import { useEffect, useState } from 'react';
import { SharePointService } from '../services/sharePointService';
import { useUser } from '../context/UserContext';
import { FaBirthdayCake, FaAward, FaCalendarAlt, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import type { Employee, AttendanceRecord, EmployeeEvent, Holiday } from '../types/attendance';

interface DashboardLeave extends Holiday {
    displayDate?: string;
    rawDate?: Date | null;
    endDate?: Date | null;
}

interface DirectoryItem {
    id: string;
    name: string;
    place?: string;
    status: string;
}

export function Dashboard() {
    const [loading, setLoading] = useState(true);

    const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [upcomingLeaves, setUpcomingLeaves] = useState<DashboardLeave[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<EmployeeEvent[]>([]);
    const [sendingWishes, setSendingWishes] = useState<{ [key: string]: boolean }>({});

    // Admin Action States Removed

    const { permissionLevel, employee: userEmployee } = useUser();

    // 1. Main Table Data: Only actual attendance records found in SharePoint
    const mergedListAll = dailyAttendance.map((record: AttendanceRecord) => {
        const emp = employees.find(e => e.id === record.employeeId || e.name === record.name);

        return {
            ...record,
            name: record.name || (emp ? emp.name : 'Unknown'),
            place: record.place || (emp ? emp.place : 'N/A'),
            status: record.status || 'Present'
        };
    });

    // 2. Filter main table display list based on user location
    const displayedList = mergedListAll.filter((item: AttendanceRecord & { place?: string }) => {
        if (permissionLevel === 'Admin' || permissionLevel === 'HR') return true;
        // Strict: If user has no place, they shouldn't see random data (or maybe they see nothing? defaulting to empty if no place)
        if (!userEmployee?.place) return false;
        return item.place?.toLowerCase()?.trim() === userEmployee.place.toLowerCase().trim();
    });

    // 3. Absentees Calculation: Compare full Directory with Records
    const fullDirectoryList = employees.map((emp: Employee) => {
        const record = dailyAttendance.find((r: AttendanceRecord) =>
            r.employeeId === emp.id || r.name === emp.name
        );
        return {
            id: emp.id,
            name: emp.name,
            place: emp.place,
            status: record ? record.status : 'Absent'
        };
    }).filter((item: { place?: string }) => {
        if (permissionLevel === 'Admin' || permissionLevel === 'HR') return true;
        if (!userEmployee?.place) return false;
        return item.place?.toLowerCase()?.trim() === userEmployee.place.toLowerCase().trim();
    });

    // 4. Derived stats
    // Count total employees in user's location (or all if Admin/HR)
    const totalEmployeesInLocation = employees.filter((emp: Employee) => {
        if (permissionLevel === 'Admin' || permissionLevel === 'HR') return true;
        if (!userEmployee?.place) return false;
        return emp.place?.toLowerCase()?.trim() === userEmployee.place.toLowerCase().trim();
    }).length;

    const currentStats = {
        totalEmployees: totalEmployeesInLocation,
        checkedIn: mergedListAll.filter((r: AttendanceRecord) => {
            if (permissionLevel === 'Admin' || permissionLevel === 'HR') return true;
            if (!userEmployee?.place) return false;
            return r.place?.toLowerCase()?.trim() === userEmployee.place.toLowerCase().trim();
        }).length,
        onLeave: mergedListAll.filter((r: AttendanceRecord) => {
            if (permissionLevel === 'Admin' || permissionLevel === 'HR') return true;
            if (!userEmployee?.place) return false;
            return (r.status as string)?.includes('Leave') && r.place?.toLowerCase()?.trim() === userEmployee.place.toLowerCase().trim();
        }).length,
        absent: fullDirectoryList.filter((r: DirectoryItem) => {
            // fullDirectoryList is already filtered by location above
            const hasRecord = dailyAttendance.some((rec: AttendanceRecord) =>
                rec.employeeId === r.id || rec.name === r.name
            );
            return !hasRecord;
        }).length
    };

    // 5. Derived absentees for sidebar widget
    const absenteesList = fullDirectoryList.filter(r => {
        // Exclude anyone who has a record in SharePoint for today
        const hasRecord = dailyAttendance.some((rec: AttendanceRecord) =>
            rec.employeeId === r.id || rec.name === r.name
        );
        if (hasRecord) return false;

        return r.status === 'Absent' || (r.status as string)?.includes('Leave');
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch Employees
                const employeesList = await SharePointService.getAllEmployees();
                setEmployees(employeesList);

                // Fetch Today's Attendance
                const now = new Date();
                const day = now.getDate().toString().padStart(2, '0');
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const year = now.getFullYear();
                const dateStr = `${day}/${month}/${year}`;

                const attendance = await SharePointService.getAllAttendanceForDate(dateStr);
                setDailyAttendance(attendance);

                // Fetch Upcoming Leaves
                const leaves = await SharePointService.getUpcomingLeaves();

                // Fetch Birthdays and Anniversaries
                const events = await SharePointService.getUpcomingEvents();
                setUpcomingEvents(events);

                // Process and filter leaves
                const processedLeaves: DashboardLeave[] = leaves.map((l: Holiday) => {
                    // Holiday interface has 'date', 'title', 'location', 'id'
                    // Check possible raw fields if 'l' comes from a raw generic fetch, but 'getUpcomingLeaves' returns Holiday[]
                    // Assuming Holiday[] is correct, we use l.date.
                    const rawVal = l.date;
                    let startDate: Date | null = null;
                    let endDate: Date | null = null;

                    if (rawVal) {
                        let startStr = rawVal;
                        let endStr = rawVal;

                        if (typeof rawVal === 'string' && rawVal.includes("-")) {
                            const parts = rawVal.split("-");
                            if (parts.length > 0) {
                                startStr = parts[0].trim();
                                endStr = parts[1] ? parts[1].trim() : startStr;
                            }
                        }

                        const parseLooseDate = (str: string): Date | null => {
                            const d = new Date(str);
                            if (!isNaN(d.getTime())) {
                                if (d.getFullYear() === 2001) {
                                    d.setFullYear(new Date().getFullYear());
                                }
                                return d;
                            }
                            return null;
                        };

                        startDate = parseLooseDate(startStr);
                        endDate = parseLooseDate(endStr);

                        if (startDate && endDate) {
                            if (endDate.getMonth() < startDate.getMonth()) {
                                endDate.setFullYear(startDate.getFullYear() + 1);
                            }
                        }
                    }

                    return {
                        ...l,
                        displayDate: rawVal,
                        rawDate: startDate,
                        endDate: endDate || startDate
                    };
                });

                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);

                const validLeaves = processedLeaves.filter(l => {
                    if (!l.endDate) return true;
                    return l.endDate >= todayMidnight;
                })
                    .sort((a, b) => {
                        if (!a.rawDate && !b.rawDate) return 0;
                        if (!a.rawDate) return 1;
                        if (!b.rawDate) return -1;
                        return a.rawDate.getTime() - b.rawDate.getTime();
                    })
                    .slice(0, 5);

                setUpcomingLeaves(validLeaves);

            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        // Refresh every minute
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleSendWish = async (event: EmployeeEvent) => {
        if (!userEmployee || !event.mailId) return;

        setSendingWishes(prev => ({ ...prev, [event.id]: true }));
        try {
            const message = event.type === 'Birthday'
                ? `${userEmployee.name} is wishing you a very Happy Birthday! 🎂`
                : `${userEmployee.name} is wishing you a Happy Work Anniversary! 🏆`;

            await SharePointService.sendWish(event.mailId, userEmployee.name, message, event.type);
            toast.success(`Wish sent to ${event.employeeName}!`);
        } catch (error) {
            console.error("Failed to send wish:", error);
            toast.error("Failed to send wish. Please try again.");
        } finally {
            setSendingWishes(prev => ({ ...prev, [event.id]: false }));
        }
    };

    // Helper for display date
    const renderLeaveDate = (leave: DashboardLeave) => {
        if (leave.displayDate) return leave.displayDate;
        if (leave.rawDate) return leave.rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return 'TBD';
    };

    // Admin Actions Removed

    return (
        <div className="space-y-6">
            {/* Edit Modal */}
            {/* Edit Modal Removed */}

            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                {/* Always show location if available, for debugging and user confirmation */}
                {userEmployee?.place ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200 shadow-sm">
                        {userEmployee.place}
                    </span>
                ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider border border-red-200 shadow-sm">
                        No Place Detected
                    </span>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Count', value: loading ? '-' : currentStats.totalEmployees, color: 'bg-blue-500' },
                    { label: 'Recorded', value: loading ? '-' : currentStats.checkedIn, color: 'bg-green-500' },
                    { label: 'On Leave', value: loading ? '-' : currentStats.onLeave, color: 'bg-yellow-500' },
                    { label: 'Absent Records', value: loading ? '-' : currentStats.absent, color: 'bg-red-500' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                    </div>
                ))}
            </div>

            {/* Location Overview - Visible ONLY to Admin and HR */}
            {(permissionLevel === 'Admin' || permissionLevel === 'HR') && (
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4 mb-2">
                    {[
                        { name: 'Chennai', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                        { name: 'Hyderabad', color: 'bg-purple-50 text-purple-700 border-purple-100' },
                        { name: 'Noida', color: 'bg-teal-50 text-teal-700 border-teal-100' },
                        { name: 'CON', color: 'bg-orange-50 text-orange-700 border-orange-100' },
                        { name: 'Canada', color: 'bg-red-50 text-red-700 border-red-100' }
                    ].map(loc => {
                        // Calculate total employees in this location from directory
                        const totalLocEmployees = employees.filter(e => e.place?.toLowerCase() === loc.name.toLowerCase()).length;

                        // Calculate stats for this location from the FULL merged list
                        const locRecords = mergedListAll.filter((r: AttendanceRecord) =>
                            r.place?.toLowerCase() === loc.name.toLowerCase()
                        );

                        const ciCount = locRecords.filter(r => r.checkInTime).length;
                        const lCount = locRecords.filter(r => (r.status as string)?.includes('Leave')).length;
                        const aCount = locRecords.filter(r => r.status === 'Absent').length;

                        return (
                            <div key={loc.name} className={`rounded-lg p-4 border ${loc.color} flex flex-col items-center justify-center min-h-[100px]`}>
                                <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-3">{loc.name} ({totalLocEmployees})</span>
                                <div className="grid grid-cols-3 gap-2 w-full text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl font-bold text-green-600 leading-none">{ciCount}</span>
                                        <span className="text-[9px] font-bold mt-1 text-green-700 opacity-60">CI</span>
                                    </div>
                                    <div className="flex flex-col items-center border-x border-current border-opacity-10">
                                        <span className="text-xl font-bold text-red-600 leading-none">{aCount}</span>
                                        <span className="text-[9px] font-bold mt-1 text-red-700 opacity-60">A</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl font-bold text-yellow-600 leading-none">{lCount}</span>
                                        <span className="text-[9px] font-bold mt-1 text-yellow-700 opacity-60">L</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Live Check-Ins */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-100 min-h-[400px]">
                    <div className="flex items-center gap-2 mb-4 text-green-600">
                        <h3 className="text-xl font-bold text-gray-800">Today's Live Check-Ins</h3>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full animate-pulse">Live</span>

                        {(permissionLevel !== 'Admin' && permissionLevel !== 'HR' && userEmployee?.place) && (
                            <span className="ml-auto text-xs text-gray-400 font-medium border border-gray-200 px-2 py-1 rounded">
                                Location: {userEmployee.place}
                            </span>
                        )}
                    </div>

                    {displayedList.length === 0 && loading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">
                            <p>Loading data...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-500">
                                        <th className="pb-3 pl-2">Employee</th>
                                        <th className="pb-3">In</th>
                                        <th className="pb-3">Out</th>
                                        <th className="pb-3">Duration</th>
                                        <th className="pb-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayedList.map((record: AttendanceRecord & { place?: string }) => (
                                        <tr key={record.id || record.name} className="hover:bg-gray-50 transition-colors group">
                                            <td className="py-3 pl-2 font-medium text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${record.status === 'Absent' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {record.name ? record.name.charAt(0) : '?'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{record.name || 'Unknown'}</span>
                                                        {/* Show location badge for Admin/HR to distinguish commonly renamed records */}
                                                        {(permissionLevel === 'Admin' || permissionLevel === 'HR') && record.place && (
                                                            <span className="text-[9px] text-gray-400">{record.place}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`py-3 font-mono text-xs font-semibold ${record.checkInTime !== '-' ? 'text-green-600' : 'text-gray-400'}`}>
                                                {record.checkInTime}
                                            </td>
                                            <td className={`py-3 font-mono text-xs ${record.checkOutTime !== '-' ? 'text-red-600' : 'text-gray-400'}`}>
                                                {record.checkOutTime || '-'}
                                            </td>
                                            <td className="py-3 text-gray-600 font-mono text-xs">
                                                {record.workingHours || '-'}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${(record.status === 'Present' || record.status === 'On Time') ? 'bg-green-100 text-green-700' :
                                                    record.status === 'Late' ? 'bg-red-100 text-red-700' :
                                                        (record.status === 'Half-Day' || record.status === 'Half Day' || record.status === 'In' || record.status === 'Checked In') ? 'bg-yellow-100 text-yellow-700' :
                                                            record.status === 'Absent' ? 'bg-red-50 text-red-500' :
                                                                record.status === 'Holiday' ? 'bg-blue-100 text-blue-700' :
                                                                    (record.status && record.status.includes('Leave')) ? 'bg-purple-100 text-purple-700' :
                                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sidebar Widgets - Stacked */}
                <div className="space-y-6">

                    {/* Birthdays & Anniversaries */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                            <div className="flex items-center gap-2 text-white">
                                <FaCalendarAlt className="text-white/80" />
                                <h3 className="font-bold">Celebrations this Month</h3>
                            </div>
                        </div>
                        <div className="p-5">
                            {upcomingEvents.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4">No celebrations this month.</p>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingEvents.map((event) => (
                                        <div key={event.id} className="flex items-center gap-4 group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${event.type === 'Birthday'
                                                ? 'bg-pink-100 text-pink-600'
                                                : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                {event.type === 'Birthday' ? <FaBirthdayCake /> : <FaAward />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate">{event.employeeName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {event.type === 'Birthday' ? 'Happy Birthday!' : 'Work Anniversary!'}
                                                </p>
                                            </div>

                                            {/* Date - Fixed width for alignment */}
                                            <span className="text-xs font-medium text-gray-500 w-12 text-right shrink-0">
                                                {event.date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                                            </span>

                                            {/* Action Area - Fixed width to prevent shifting */}
                                            <div className="w-24 flex justify-end shrink-0">
                                                {event.mailId && event.mailId !== userEmployee?.email && (
                                                    <button
                                                        onClick={() => handleSendWish(event)}
                                                        disabled={sendingWishes[event.id]}
                                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs font-bold ${sendingWishes[event.id]
                                                            ? 'text-gray-400 cursor-not-allowed'
                                                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                                            }`}
                                                        title="Send Wish"
                                                    >
                                                        {sendingWishes[event.id] ? (
                                                            <span>Sending...</span>
                                                        ) : (
                                                            <>
                                                                <span>Send Wish</span>
                                                                <FaPaperPlane className="text-[10px]" />
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Today Absentees - Directory Comparison */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-800">Today Absentees</h3>
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">{absenteesList.length}</span>
                        </div>
                        {absenteesList.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No absentees recorded.</p>
                        ) : (
                            <div className="space-y-3">
                                {absenteesList.map((record: DirectoryItem, i: number) => (
                                    <div key={i} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-bold text-xs">
                                            {record.name ? record.name.charAt(0) : '!'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{record.name}</p>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${record.status.includes('Leave') ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {record.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Planned Leaves */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-800">Planned Leaves</h3>
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-bold">{upcomingLeaves.length}</span>
                        </div>
                        {upcomingLeaves.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No upcoming leaves.</p>
                        ) : (
                            <div className="space-y-4">
                                {upcomingLeaves.map((leave, i) => (
                                    <div key={i} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div className="flex-col items-center justify-center text-center min-w-[3rem] bg-orange-50 rounded p-1">
                                            {/* Calendar icon Date Day */}
                                            <span className="block text-xs font-bold text-orange-600">
                                                {leave.rawDate ? leave.rawDate.toLocaleDateString('en-US', { weekday: 'short' }) : 'PLAN'}
                                            </span>
                                            <span className="block text-[10px] text-orange-400">
                                                {leave.rawDate ? leave.rawDate.getDate() : '-'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 line-clamp-1">{leave.title || 'Leave'}</p>
                                            <p className="text-xs text-gray-500">{renderLeaveDate(leave)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
