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
            days.push(<div key={`empty-${monthIndex}-${i}`} className="h-5 w-5"></div>);
        }

        // Add days of the month
        for (let d = 1; d <= daysInMonth; d++) {
            const colorClass = getStatusColor(d, monthIndex, selectedYear);
            days.push(
                <div
                    key={`${monthIndex}-${d}`}
                    className={`h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 hover:scale-110 cursor-default ${colorClass}`}
                    title={attendanceData.find(r => r.date === `${d.toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')}/${selectedYear}`)?.status || 'No Record'}
                >
                    {d}
                </div>
            );
        }

        // Fill remaining cells to complete 6 rows (42 cells total)
        const totalCells = firstDay + daysInMonth;
        const cellsNeeded = 42; // 6 rows × 7 columns
        for (let i = totalCells; i < cellsNeeded; i++) {
            days.push(<div key={`empty-end-${monthIndex}-${i}`} className="h-5 w-5"></div>);
        }

        return (
            <div key={monthIndex} className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-2 border border-white/20 hover:shadow-xl transition-all duration-300 group">
                <h3 className="text-center font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-wide text-xs">
                    {months[monthIndex]}
                </h3>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {dayNames.map(name => (
                        <div key={name} className="text-[9px] font-bold text-gray-400 uppercase">
                            {name}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div >
        );
    };


    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 overflow-hidden">
            {/* Compact Header */}
            <div className="shrink-0 bg-white/70 backdrop-blur-sm border-b border-gray-200 px-4 py-1">
                <div className="flex items-center justify-between max-w-[1800px] mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <FaCalendarAlt className="text-white text-sm" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-800">Employee Leave Calendar</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500 text-sm">
                                <FaUser />
                            </div>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                disabled={fetchingEmployees}
                            >
                                {fetchingEmployees ? (
                                    <option>Loading...</option>
                                ) : (
                                    employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={`px-3 py-1 rounded text-sm font-semibold transition-all ${selectedYear === year
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-600 hover:text-indigo-600'
                                        }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchAttendance}
                            className="p-1.5 bg-white border border-gray-200 text-indigo-600 rounded-lg hover:bg-gray-50 transition-all"
                            title="Refresh"
                        >
                            <FaSync className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid - Fit to screen, no scroll */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-1 overflow-hidden">
                <div className="grid grid-cols-4 gap-3 max-w-[1600px] w-full mx-auto">
                    {months.map((_, index) => renderMonth(index))}
                </div>
            </div>

            {/* Legend - Fixed at bottom */}
            <div className="shrink-0 bg-white/70 backdrop-blur-sm border-t border-gray-200 px-4 py-1">
                <div className="flex flex-wrap justify-center gap-3 max-w-[1800px] mx-auto">
                    <LegendItem color="bg-green-500" label="Present" count={attendanceData.filter(r => ['in', 'present'].includes(r.status.toLowerCase())).length} />
                    <LegendItem color="bg-red-500" label="Absent" count={attendanceData.filter(r => r.status.toLowerCase().includes('absent')).length} />
                    <LegendItem color="bg-orange-500" label="Halfday" count={attendanceData.filter(r => r.status.toLowerCase().includes('half')).length} />
                    <LegendItem color="bg-blue-600" label="Holiday" count={attendanceData.filter(r => r.status.toLowerCase().includes('holiday')).length} />
                    <LegendItem color="bg-purple-500" label="Leave" count={attendanceData.filter(r => r.status.toLowerCase().includes('leave')).length} />
                    <LegendItem color="bg-gray-200 border border-gray-300" label="No Record" text="text-gray-500" />
                </div>
            </div>
        </div>
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


