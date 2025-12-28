import React, { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import { FaCalendarAlt, FaUser, FaSync } from 'react-icons/fa';
import { isWeekend } from '../../utils/timeUtils';
import type { AttendanceRecord, Employee } from '../../types/attendance';

export const ReportsEmployeeLeaveCalendar: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchingEmployees, setFetchingEmployees] = useState<boolean>(true);

    const years = [2025, 2026, 2027];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                setFetchingEmployees(true);
                const data = await SharePointService.getAllEmployees();
                // Sort employees by name
                const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
                setEmployees(sorted);
                if (sorted.length > 0) {
                    setSelectedEmployee(sorted[0].id);
                }
            } catch (error) {
                console.error("Failed to load employees", error);
            } finally {
                setFetchingEmployees(false);
            }
        };
        loadEmployees();
    }, []);

    const fetchAttendance = React.useCallback(async () => {
        const emp = employees.find(e => e.id === selectedEmployee);
        if (!emp) return;

        try {
            setLoading(true);
            const data = await SharePointService.getEmployeeAttendanceForYear(emp.id, emp.name, selectedYear);
            setAttendanceData(data);
        } catch (error) {
            console.error("Failed to fetch year attendance", error);
        } finally {
            setLoading(false);
        }
    }, [employees, selectedEmployee, selectedYear]);

    useEffect(() => {
        if (selectedEmployee && employees.length > 0) {
            fetchAttendance();
        }
    }, [selectedEmployee, selectedYear, fetchAttendance, employees.length]);

    const getStatusColor = (day: number, month: number, year: number) => {
        const dateStr = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
        const records = attendanceData.filter(r => r.date === dateStr);

        if (records.length === 0) {
            const date = new Date(year, month, day);
            if (isWeekend(date)) return 'bg-gray-50 text-gray-300'; // Weekend, no record
            // Past date with no record might be considered absent in some contexts, 
            // but here we only color if explicitly marked.
            return 'bg-gray-50 text-gray-300';
        }

        // Priority for overlapping statuses
        const status = records[0].status.toLowerCase();

        if (status === 'in' || status === 'present' || status.includes('time')) return 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]';
        if (status.includes('half')) return 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]';
        if (status.includes('holiday')) return 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]';
        if (status.includes('absent')) return 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]';
        if (status.includes('leave')) return 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]';

        return 'bg-indigo-500 text-white';
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderMonth = (monthIndex: number) => {
        const daysInMonth = getDaysInMonth(selectedYear, monthIndex);
        const firstDay = getFirstDayOfMonth(selectedYear, monthIndex);
        const days = [];

        // Add empty cells for days from previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${monthIndex}-${i}`} className="h-8 w-8"></div>);
        }

        // Add days of the month
        for (let d = 1; d <= daysInMonth; d++) {
            const colorClass = getStatusColor(d, monthIndex, selectedYear);
            days.push(
                <div
                    key={`${monthIndex}-${d}`}
                    className={`h-8 w-8 flex items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 hover:scale-110 cursor-default ${colorClass}`}
                    title={attendanceData.find(r => r.date === `${d.toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')}/${selectedYear}`)?.status || 'No Record'}
                >
                    {d}
                </div>
            );
        }

        return (
            <div key={monthIndex} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-white/20 hover:shadow-2xl transition-all duration-500 group">
                <h3 className="text-center font-bold text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors uppercase tracking-widest text-xs">
                    {months[monthIndex]}
                </h3>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {dayNames.map(name => (
                        <div key={name} className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                            {name}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-6 space-y-6">
            {/* Header / Controls */}
            <div className="relative group overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6 transition-all duration-500 hover:shadow-indigo-200/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-1000"></div>

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 animate-bounce-slow">
                            <FaCalendarAlt className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-purple-800">
                                Employee Leave Calendar
                            </h1>
                            <p className="text-gray-500 text-sm font-medium">Yearly attendance overview and status tracking</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Employee Select */}
                        <div className="relative w-full md:w-64 group/select">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 z-10">
                                <FaUser />
                            </div>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all appearance-none font-semibold text-gray-700 cursor-pointer"
                                disabled={fetchingEmployees}
                            >
                                {fetchingEmployees ? (
                                    <option>Loading employees...</option>
                                ) : (
                                    employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))
                                )}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDownIcon className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Year Select */}
                        <div className="flex bg-white/80 rounded-2xl p-1 border border-gray-100 shadow-sm overflow-hidden">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${selectedYear === year
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md transform scale-105'
                                        : 'text-gray-400 hover:text-indigo-600'
                                        }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={fetchAttendance}
                                className="p-3 bg-white/80 hover:bg-white text-indigo-600 rounded-2xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95"
                                title="Refresh Data"
                            >
                                <FaSync className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-[2px] rounded-3xl">
                        <div className="bg-white/80 p-6 rounded-3xl shadow-2xl border border-white flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-indigo-900 font-bold animate-pulse">Fetching Attendance Records...</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {months.map((_, index) => renderMonth(index))}
                </div>
            </div>

            {/* Legend & Summary */}
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-6">
                <div className="flex flex-wrap justify-center gap-8">
                    <LegendItem color="bg-green-500" label="Present" count={attendanceData.filter(r => ['in', 'present'].includes(r.status.toLowerCase())).length} />
                    <LegendItem color="bg-red-500" label="Absent" count={attendanceData.filter(r => r.status.toLowerCase().includes('absent')).length} />
                    <LegendItem color="bg-orange-500" label="Halfday" count={attendanceData.filter(r => r.status.toLowerCase().includes('half')).length} />
                    <LegendItem color="bg-blue-600" label="Holiday" count={attendanceData.filter(r => r.status.toLowerCase().includes('holiday')).length} />
                    <LegendItem color="bg-purple-500" label="Leave" count={attendanceData.filter(r => r.status.toLowerCase().includes('leave')).length} />
                    <LegendItem color="bg-gray-100 border border-gray-200" label="No Record" text="text-gray-400" />
                </div>
            </div>
        </div >
    );
};

// Helper Components
const LegendItem: React.FC<{ color: string, label: string, count?: number, text?: string }> = ({ color, label, count, text }) => (
    <div className="flex items-center gap-3 group cursor-help">
        <div className={`w-4 h-4 rounded-full ${color} shadow-lg transition-transform group-hover:scale-125`}></div>
        <div className="flex flex-col">
            <span className={`text-[10px] uppercase font-black tracking-widest ${text || 'text-gray-700'}`}>{label}</span>
            {count !== undefined && (
                <span className="text-xs font-bold text-gray-400">{count} Days</span>
            )}
        </div>
    </div>
);

const ChevronDownIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);
