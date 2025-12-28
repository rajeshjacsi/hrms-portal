import { useState, useEffect } from 'react';
import { FaDownload, FaSearch, FaCalendarAlt, FaFileExcel } from 'react-icons/fa';
import { SharePointService } from '../../services/sharePointService';
import * as XLSX from 'xlsx-js-style';
import { NotificationModal } from '../../components/NotificationModal';
import type { AttendanceRecord } from '../../types/attendance';

interface AttendanceReportData {
    Date: string; // DD/MM/YYYY
    EmployeeName: string;
    StaffMail: string;
    Place: string;
    CheckInTime: string;
    CheckOutTime: string;
    WorkingHours: string;
    Status: string;
    // For sorting
    rawDate?: Date;
}

export const ReportsDownloadReport = () => {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reportData, setReportData] = useState<AttendanceReportData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Notification State
    const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Set Default Dates on Mount
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // Format to YYYY-MM-DD for input fields
        const formatDate = (d: Date) => {
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        setFromDate(formatDate(firstDay));
        // If today is 1st day, yesterday is last month, which is also fine.
        setToDate(formatDate(yesterday));
    }, []);

    const handleFetchReport = async () => {
        if (!fromDate || !toDate) {
            setError('Please select both From Date and To Date.');
            return;
        }

        if (new Date(fromDate) > new Date(toDate)) {
            setError('From Date cannot be later than To Date.');
            return;
        }

        setError(null);
        setLoading(true);
        setReportData([]);

        try {
            // Pass YYYY-MM-DD directly for correct string comparison in SharePointService
            const results = await SharePointService.getAllAttendanceInRange(fromDate, toDate);

            // Process and Sort Data Ascending by Date
            const processedData: AttendanceReportData[] = results.map((item: AttendanceRecord) => {
                const [d, m, y] = item.date.split('/');
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

                return {
                    Date: item.date,
                    EmployeeName: item.name || '',
                    StaffMail: item.email || '',
                    Place: item.place || '',
                    CheckInTime: item.checkInTime || '',
                    CheckOutTime: item.checkOutTime || '',
                    WorkingHours: item.workingHours || '',
                    Status: item.status || '',
                    rawDate: dateObj
                };
            });

            // Sort by Date Ascending
            processedData.sort((a, b) => (a.rawDate && b.rawDate ? a.rawDate.getTime() - b.rawDate.getTime() : 0));

            setReportData(processedData);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch attendance records. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    const handleDownloadExcel = () => {
        console.log("Starting Excel Download...");
        if (reportData.length === 0) {
            console.warn("No data to download");
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // --- 1. Attendance Summary (First/Home Sheet) ---
            // Use Omit to define the shape of records without rawDate
            type AttendanceExportRow = Omit<AttendanceReportData, 'rawDate'>;
            const employeeMap = new Map<string, AttendanceExportRow[]>();

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            reportData.forEach(({ rawDate: _rawDate, ...record }) => {
                const empName = record.EmployeeName;
                if (!employeeMap.has(empName)) {
                    employeeMap.set(empName, []);
                }
                employeeMap.get(empName)?.push(record);
            });


            const summaryData = Array.from(employeeMap.entries()).map(([empName, records]) => {
                // Aggregate Counts
                let present = 0;
                let leave = 0;
                let halfDay = 0;
                let absent = 0;
                let holidays = 0;

                records.forEach(r => {
                    const s = r.Status || '';
                    if (['Present', 'On Time', 'Work From Home'].some(v => s.includes(v))) present++;
                    else if (s.includes('Half Day')) halfDay++;
                    else if (['Leave', 'Sick Leave', 'Casual Leave', 'Privilege Leave'].some(v => s.includes(v))) leave++;
                    else if (s.includes('Absent') || s.includes('IN') || s === 'IN') absent++;
                    else if (s.includes('Holiday')) holidays++;
                    else if (s === '') { /* Handle empty as absent or ignore? Usually Absent if no checkin */ absent++; }
                });

                // Working Days = Present + Absent + Leave + Half Day (excludes holidays)
                const workingDays = present + absent + leave + halfDay;

                return {
                    "Employee Name": empName,
                    "Working Days": workingDays,
                    "Present": present,
                    "Leave": leave,
                    "Half Day": halfDay,
                    "Absent": absent,
                    "Holidays": holidays
                };
            });

            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            // Adjust column widths for summary
            wsSummary['!cols'] = [
                { wch: 20 }, // Employee Name
                { wch: 15 }, // Working Days
                { wch: 10 }, // Present
                { wch: 10 }, // Leave
                { wch: 10 }, // Half Day
                { wch: 10 }, // Absent
                { wch: 10 }  // Holidays
            ];
            XLSX.utils.book_append_sheet(wb, wsSummary, "Attendance Summary");


            // --- 2. Full Data Sheet ---
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fullDataSheet = reportData.map(({ rawDate: _rawDate, ...rest }) => rest);
            const wsFull = XLSX.utils.json_to_sheet(fullDataSheet);
            // Adjust column widths for full data
            wsFull['!cols'] = [
                { wch: 12 }, // Date
                { wch: 20 }, // Name
                { wch: 25 }, // Email
                { wch: 10 }, // Place
                { wch: 10 }, // In
                { wch: 10 }, // Out
                { wch: 12 }, // Hours
                { wch: 12 }  // Status
            ];
            XLSX.utils.book_append_sheet(wb, wsFull, "Full Data");


            // --- 3. Individual Employee Sheets ---
            employeeMap.forEach((records, empName) => {
                // Calculate summary for this employee
                let present = 0;
                let leave = 0;
                let halfDay = 0;
                let absent = 0;
                let holidays = 0;

                records.forEach(r => {
                    const s = r.Status || '';
                    if (['Present', 'On Time', 'Work From Home'].some(v => s.includes(v))) present++;
                    else if (s.includes('Half Day')) halfDay++;
                    else if (['Leave', 'Sick Leave', 'Casual Leave', 'Privilege Leave'].some(v => s.includes(v))) leave++;
                    else if (s.includes('Absent') || s.includes('IN') || s === 'IN') absent++;
                    else if (s.includes('Holiday')) holidays++;
                    else if (s === '') absent++;
                });

                const workingDays = present + absent + leave + halfDay;

                // Records are already clean (rawDate stripped during Map population)
                const cleanRecords = records;
                const safeSheetName = empName.substring(0, 30).replace(/[\\/?*[\]]/g, "");

                // Create worksheet with attendance data
                const wsEmp = XLSX.utils.json_to_sheet(cleanRecords);

                // Add summary table to the right side (starting at column K, row 1)
                const summaryStartCol = 10; // Column K (0-indexed)
                const summaryStartRow = 0;

                // Add summary headers
                XLSX.utils.sheet_add_aoa(wsEmp, [['Metric', 'Count']], { origin: { r: summaryStartRow, c: summaryStartCol } });

                // Add summary data with colors
                const summaryData = [
                    { metric: 'Working Days', count: workingDays, color: 'C6E0B4' }, // Light green
                    { metric: 'Present', count: present, color: '92D050' }, // Green
                    { metric: 'Absent', count: absent, color: 'FFC7CE' }, // Pink
                    { metric: 'Leave', count: leave, color: 'FFC000' }, // Orange
                    { metric: 'Half Day', count: halfDay, color: 'FFFF00' }, // Yellow
                    { metric: 'Holidays', count: holidays, color: '00B0F0' } // Cyan
                ];

                summaryData.forEach((item, idx) => {
                    const row = summaryStartRow + 1 + idx;
                    XLSX.utils.sheet_add_aoa(wsEmp, [[item.metric, item.count]], { origin: { r: row, c: summaryStartCol } });

                    // Apply color to metric cell
                    const metricCell = XLSX.utils.encode_cell({ r: row, c: summaryStartCol });
                    if (!wsEmp[metricCell]) wsEmp[metricCell] = { t: 's', v: item.metric };
                    wsEmp[metricCell].s = {
                        fill: { fgColor: { rgb: item.color } },
                        font: { name: 'Times New Roman', sz: 11, bold: true },
                        alignment: { horizontal: 'left', vertical: 'center' }
                    };

                    // Apply font to count cell
                    const countCell = XLSX.utils.encode_cell({ r: row, c: summaryStartCol + 1 });
                    if (!wsEmp[countCell]) wsEmp[countCell] = { t: 'n', v: item.count };
                    wsEmp[countCell].s = {
                        font: { name: 'Times New Roman', sz: 11 },
                        alignment: { horizontal: 'center', vertical: 'center' }
                    };
                });

                // Apply Times New Roman font to all attendance data cells
                const range = XLSX.utils.decode_range(wsEmp['!ref'] || 'A1');
                for (let row = 0; row <= range.e.r; row++) {
                    for (let col = 0; col <= 8; col++) { // Columns A-I (attendance data)
                        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                        const cell = wsEmp[cellAddress];
                        if (cell) {
                            if (!cell.s) cell.s = {};
                            cell.s.font = { name: 'Times New Roman', sz: 11 };
                        }
                    }
                }

                // Apply color coding to status column (column H)
                const statusCol = 7;
                for (let row = 1; row <= range.e.r; row++) { // Start from row 1 (skip header)
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: statusCol });
                    const cell = wsEmp[cellAddress];

                    if (cell && cell.v) {
                        const status = String(cell.v);
                        let fillColor = 'FFFFFF';

                        if (['Present', 'On Time'].some(v => status.includes(v))) {
                            fillColor = '92D050'; // Green
                        } else if (status.includes('Half Day')) {
                            fillColor = 'FFFF00'; // Yellow
                        } else if (status.includes('Absent')) {
                            fillColor = 'FFC7CE'; // Pink
                        } else if (['Leave', 'Sick Leave', 'Casual Leave', 'Privilege Leave'].some(v => status.includes(v))) {
                            fillColor = 'FFC000'; // Orange
                        } else if (status.includes('Holiday')) {
                            fillColor = '00B0F0'; // Cyan
                        }

                        cell.s = {
                            fill: { fgColor: { rgb: fillColor } },
                            font: { name: 'Times New Roman', sz: 11, bold: true },
                            alignment: { horizontal: 'center', vertical: 'center' }
                        };
                    }
                }

                // Apply font to summary headers
                const headerMetricCell = XLSX.utils.encode_cell({ r: summaryStartRow, c: summaryStartCol });
                const headerCountCell = XLSX.utils.encode_cell({ r: summaryStartRow, c: summaryStartCol + 1 });
                if (wsEmp[headerMetricCell]) {
                    wsEmp[headerMetricCell].s = {
                        font: { name: 'Times New Roman', sz: 11, bold: true },
                        fill: { fgColor: { rgb: 'D9D9D9' } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                    };
                }
                if (wsEmp[headerCountCell]) {
                    wsEmp[headerCountCell].s = {
                        font: { name: 'Times New Roman', sz: 11, bold: true },
                        fill: { fgColor: { rgb: 'D9D9D9' } },
                        alignment: { horizontal: 'center', vertical: 'center' }
                    };
                }

                wsEmp['!cols'] = [
                    { wch: 12 }, // Date
                    { wch: 20 }, // Name
                    { wch: 25 }, // Email
                    { wch: 10 }, // Place
                    { wch: 12 }, // CheckIn
                    { wch: 12 }, // CheckOut
                    { wch: 12 }, // Hours
                    { wch: 12 }, // Status
                    { wch: 2 },  // Spacer
                    { wch: 2 },  // Spacer
                    { wch: 15 }, // Metric
                    { wch: 10 }  // Count
                ];
                XLSX.utils.book_append_sheet(wb, wsEmp, safeSheetName);
            });

            // Download
            console.log("Writing file...");
            XLSX.writeFile(wb, `Attendance_Report_${fromDate}_to_${toDate}.xlsx`, { cellStyles: true });
            console.log("Download triggered.");
        } catch (err) {
            console.error("Excel Generation Error:", err);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Export Failed',
                message: 'Failed to generate Excel report. Please check the console.'
            });
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800">Download Attendance Report</h1>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 md:items-end">
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">From Date</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-48"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">To Date</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-48"
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
                <button
                    onClick={handleFetchReport}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 h-[42px]"
                >
                    {loading ? (
                        <>Loading...</>
                    ) : (
                        <><FaSearch /> Fetch Report</>
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            {/* Data Table with Export */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" />
                        Report Data
                        {reportData.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{reportData.length} records</span>}
                    </h2>

                    {reportData.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleDownloadExcel}
                                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                            >
                                <FaFileExcel /> Download Excel
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto">
                    {reportData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10">
                            <FaDownload className="text-4xl mb-4 opacity-20" />
                            <p>Select a date range and fetch data to generate report.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Employee Name</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Email</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Place</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Check In</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Check Out</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Working Hours</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportData.map((row, idx) => (
                                    <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{row.Date}</td>
                                        <td className="px-6 py-4">{row.EmployeeName}</td>
                                        <td className="px-6 py-4 text-gray-500">{row.StaffMail}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">{row.Place}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-green-600">{row.CheckInTime}</td>
                                        <td className="px-6 py-4 font-mono text-red-600">{row.CheckOutTime}</td>
                                        <td className="px-6 py-4 font-mono font-bold">{row.WorkingHours}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${['Present', 'On Time'].includes(row.Status) ? 'bg-green-100 text-green-700' :
                                                row.Status === 'Absent' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {row.Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Notification Modal */}
            <NotificationModal
                isOpen={notification.isOpen}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() => setNotification({ ...notification, isOpen: false })}
            />
        </div>
    );
};
