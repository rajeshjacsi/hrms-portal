import React, { useState } from 'react';
import { SharePointService } from '../services/sharePointService';
import { FaCalendarAlt, FaSearch, FaFileExport, FaFilter, FaUsers, FaExclamationTriangle, FaHistory } from 'react-icons/fa';
import type { AttendanceRecord } from '../types/attendance';

interface AttendanceSummary {
    employeeName: string;
    totalWorkingDays: number;
    present: number;
    leave: number;
    halfDay: number;
    absent: number;
    holiday: number;
}

export const MonthlyAttendance: React.FC = () => {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    const [fromDate, setFromDate] = useState(defaultStart);
    const [toDate, setToDate] = useState(defaultEnd);
    const [summaryData, setSummaryData] = useState<AttendanceSummary[]>([]);

    // Additional Report states
    const [missedCheckouts, setMissedCheckouts] = useState<AttendanceRecord[]>([]);
    const [regularizations, setRegularizations] = useState<AttendanceRecord[]>([]);

    const [loading, setLoading] = useState(false);
    const [calculated, setCalculated] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    const getDaysArray = (start: Date, end: Date) => {
        const arr = [];
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            arr.push(new Date(dt));
        }
        return arr;
    };

    const handleCalculate = async () => {
        setLoading(true);
        try {
            console.log(`[Monthly Attendance] Starting calculation from ${fromDate} to ${toDate}`);

            const [employees, attendanceRecords, leaveRequests, holidays] = await Promise.all([
                SharePointService.getAllEmployees(),
                SharePointService.getAllAttendanceInRange(fromDate, toDate),
                SharePointService.getAllLeaveRequests(),
                SharePointService.getHolidays("USA Holiday List")
            ]);

            console.log(`[Monthly Attendance] Data fetched:`, {
                employees: employees.length,
                attendanceRecords: attendanceRecords.length,
                leaveRequests: leaveRequests.length,
                holidays: holidays.length
            });

            const summaries: AttendanceSummary[] = employees.map(emp => {
                const days = getDaysArray(new Date(fromDate), new Date(toDate));
                let presentCount = 0;
                let halfDayCount = 0;
                let leaveCount = 0;
                let absentCount = 0;
                let holidayCount = 0;

                days.forEach(day => {
                    const dateStrUK = `${day.getDate().toString().padStart(2, '0')}/${(day.getMonth() + 1).toString().padStart(2, '0')}/${day.getFullYear()}`;

                    // Skip weekends
                    if (isWeekend(day)) return;

                    // Find attendance record for this employee on this date
                    const record = attendanceRecords.find(r =>
                        (r.employeeId === emp.id || r.name === emp.name) &&
                        r.date === dateStrUK
                    );

                    if (record && record.status) {
                        const status = record.status.toLowerCase();

                        // Count based on status field
                        if (status === 'present' || status === 'on time') {
                            presentCount++;
                        } else if (status === 'half-day' || status === 'half day' || status === 'late') {
                            halfDayCount++;
                        } else if (status.includes('leave')) {
                            leaveCount++;
                        } else if (status === 'absent' || status === 'in') {
                            absentCount++;
                        } else if (status === 'holiday') {
                            holidayCount++;
                        }
                        // Removed: Don't count missing records or unknown statuses as absent
                    }
                });

                return {
                    employeeName: emp.name,
                    totalWorkingDays: presentCount + absentCount + leaveCount + halfDayCount, // Working days = P + A + L + HD (excludes holidays)
                    present: presentCount,
                    leave: leaveCount,
                    halfDay: halfDayCount,
                    absent: absentCount,
                    holiday: holidayCount
                };
            });


            // Missed: CheckIn exists, CheckOut missing, AND within range
            const missed = attendanceRecords.filter(r => {
                if (!r.checkInTime || (r.checkOutTime && r.checkOutTime !== '-')) return false;

                // Parse r.date (DD/MM/YYYY)
                const [d, m, y] = r.date.split('/');
                const rDateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

                // Check if within selected range
                const isInRange = rDateISO >= fromDate && rDateISO <= toDate;

                return isInRange;
            });

            // Regularized: regularized === 'YES', AND within range
            const regs = attendanceRecords.filter(r => {
                const isReg = r.regularized && (r.regularized === 'YES' || r.regularized === 'Yes');
                if (!isReg) return false;

                // Parse r.date (DD/MM/YYYY)
                const [d, m, y] = r.date.split('/');
                const rDateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

                const isInRange = rDateISO >= fromDate && rDateISO <= toDate;
                return isInRange;
            });

            setMissedCheckouts(missed);
            setRegularizations(regs);

            // Sort summaries alphabetically by employee name (ascending)
            const sortedSummaries = summaries.sort((a, b) =>
                a.employeeName.localeCompare(b.employeeName)
            );

            setSummaryData(sortedSummaries);
            setCalculated(true);
            console.log(`[Monthly Attendance] Calculation complete. ${sortedSummaries.length} employee summaries generated.`);
        } catch (e) {
            console.error("[Monthly Attendance] Calculation failed:", e);
            setErrorModal({
                show: true,
                message: e instanceof Error ? e.message : 'An unexpected error occurred while generating the report.'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredData = summaryData.filter(item =>
        item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMissedCheckouts = missedCheckouts.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredRegularizations = regularizations.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col font-sans text-gray-800 bg-gray-50 min-h-full">
            {/* Header Section */}
            <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-[100]" style={{ zIndex: 100, backgroundColor: '#ffffff', position: 'sticky', top: 0 }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <FaUsers className="text-xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Monthly Attendance</h1>
                                <span className="bg-gray-100 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200">v1.6</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">Overview & Analytics</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center bg-gray-100 rounded-md px-3 py-2 border border-transparent focus-within:border-blue-500 focus-within:bg-white">
                            <FaCalendarAlt className="text-gray-400 mr-2 text-sm" />
                            <span className="text-xs font-semibold mr-2 text-gray-500">FROM</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                            />
                        </div>
                        <div className="hidden md:flex items-center bg-gray-100 rounded-md px-3 py-2 border border-transparent focus-within:border-blue-500 focus-within:bg-white">
                            <FaCalendarAlt className="text-gray-400 mr-2 text-sm" />
                            <span className="text-xs font-semibold mr-2 text-gray-500">TO</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={handleCalculate}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <FaFilter className="text-xs" />
                                    <span>Get Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Stats Cards (Placeholder for future) or Instructions */}
                {!calculated && !loading && (
                    <div className="flex flex-col items-center justify-center h-96 text-center animate-fade-in-up">
                        <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                            <FaFileExport className="text-4xl text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to generate report</h2>
                        <p className="text-gray-500 max-w-md">Select a date range above and click "Get Report" to calculate attendance statistics for all employees.</p>
                    </div>
                )}

                {/* Data Tables */}
                {(calculated || loading) && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
                            {/* Left Column: Summary Table (75% Width) */}
                            <div className="lg:col-span-9 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-full">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <FaUsers className="text-blue-500" />
                                        <h3 className="font-bold text-gray-800">Attendance Summary</h3>
                                    </div>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search Employee..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 transition-shadow"
                                        />
                                    </div>
                                </div>

                                {/* Table Header */}
                                <div className="bg-gray-100 border-b border-gray-200">
                                    <div className="grid grid-cols-12 text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-2 text-center">
                                        <div className="col-span-4 text-left pl-4">Employee</div>
                                        <div className="col-span-1" title="Working Days">WD</div>
                                        <div className="col-span-1 text-green-600" title="Present">P</div>
                                        <div className="col-span-1 text-blue-600" title="Leave">L</div>
                                        <div className="col-span-2 text-orange-500" title="Half Day">HD</div>
                                        <div className="col-span-2 text-red-500" title="Absent">A</div>
                                        <div className="col-span-1 text-purple-600" title="Holiday">H</div>
                                    </div>
                                </div>

                                {/* Table Body */}
                                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
                                    {loading ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-sm">
                                            <div className="flex flex-col items-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                                <p className="text-sm font-semibold text-gray-600">Analyzing records...</p>
                                            </div>
                                        </div>
                                    ) : filteredData.length > 0 ? (
                                        filteredData.map((row, idx) => (
                                            <div key={idx} className="grid grid-cols-12 py-3 px-2 border-b border-gray-100 hover:bg-blue-50/50 transition-colors items-center group text-center">
                                                <div className="col-span-4 text-left pl-4">
                                                    <div className="font-semibold text-gray-900 text-sm truncate" title={row.employeeName}>{row.employeeName}</div>
                                                </div>
                                                <div className="col-span-1 text-sm font-medium text-gray-700">{row.totalWorkingDays}</div>
                                                <div className="col-span-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {row.present}
                                                    </span>
                                                </div>
                                                <div className="col-span-1 text-sm font-medium text-gray-600">{row.leave}</div>
                                                <div className="col-span-2 text-sm font-medium text-gray-600">{row.halfDay}</div>
                                                <div className="col-span-2 text-sm font-medium text-gray-600">{row.absent}</div>
                                                <div className="col-span-1 text-sm font-medium text-gray-600">{row.holiday}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center text-gray-400">
                                            <p>No records found matching your search.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Stacked Widgets (25% Width) */}
                            <div className="lg:col-span-3 flex flex-col gap-6 h-full">

                                {/* Missed Checkouts (Top Half) */}
                                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col flex-1 animate-fade-in">
                                    <div className="px-4 py-4 border-b border-gray-100 bg-red-50/50 flex items-center gap-2">
                                        <div className="p-1.5 bg-red-100 rounded text-red-600 shrink-0">
                                            <FaExclamationTriangle />
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm truncate">Missed Checkouts</h3>
                                        <span className="ml-auto text-[10px] font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">{filteredMissedCheckouts.length}</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                        {filteredMissedCheckouts.length > 0 ? (
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2">Employee</th>
                                                        <th className="px-3 py-2">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredMissedCheckouts.map((missed, idx) => (
                                                        <tr key={idx} className="hover:bg-red-50/30">
                                                            <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[100px]" title={missed.name}>{missed.name}</td>
                                                            <td className="px-3 py-2 text-gray-600">{missed.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
                                                <div className="text-2xl mb-1 opacity-20">👍</div>
                                                <p className="text-xs">No missed checkouts found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Regularizations (Bottom Half) */}
                                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col flex-1 animate-fade-in">
                                    <div className="px-4 py-4 border-b border-gray-100 bg-purple-50/50 flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-100 rounded text-purple-600 shrink-0">
                                            <FaHistory />
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm truncate">Regularization</h3>
                                        <span className="ml-auto text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{filteredRegularizations.length}</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                        {filteredRegularizations.length > 0 ? (
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2">Employee</th>
                                                        <th className="px-3 py-2">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredRegularizations.map((reg, idx) => (
                                                        <tr key={idx} className="hover:bg-purple-50/30">
                                                            <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[100px]" title={reg.name}>{reg.name}</td>
                                                            <td className="px-3 py-2 text-gray-600">{reg.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
                                                <div className="text-2xl mb-1 opacity-20">📋</div>
                                                <p className="text-xs">No regularizations found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Error Modal */}
            {errorModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
                        <div className="bg-red-50 border-b border-red-100 px-6 py-4 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                    <FaExclamationTriangle className="text-xl" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Report Generation Failed</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">{errorModal.message}</p>
                            <p className="text-sm text-gray-500">Please check the browser console for detailed error information.</p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setErrorModal({ show: false, message: '' })}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
