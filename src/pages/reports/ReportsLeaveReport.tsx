import { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import type { LeaveRequest } from '../../types/attendance';
import { FaSearch, FaFileExcel } from 'react-icons/fa';

export const ReportsLeaveReport = () => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDateInput = (d: Date) => d.toISOString().split('T')[0];

    const [dateFrom, setDateFrom] = useState(formatDateInput(firstDay));
    const [dateTo, setDateTo] = useState(formatDateInput(lastDay));

    const fetchReport = async () => {
        setLoading(true);
        try {
            console.log("Fetching report for:", dateFrom, dateTo);
            // Service implements Shotgun Strategy to get ALL data safely
            const data = await SharePointService.getAllLeaveRequests(dateFrom, dateTo);

            console.log(`Fetched ${data.length} leave requests from SharePoint`);

            // Filter by date range - convert to Date objects for proper comparison (local time)
            const parseLocalDate = (dateStr: string) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                return new Date(y, m - 1, d);
            };
            const fromDateObj = parseLocalDate(dateFrom);
            const toDateObj = parseLocalDate(dateTo);
            toDateObj.setHours(23, 59, 59, 999); // End of day for inclusion

            const filtered = data.filter(req => {
                if (!req.fromDate || req.fromDate === 'N/A') return false;

                // Parse the fromDate (could be YYYY-MM-DD or ISO format or DD/MM/YYYY)
                let reqDate: Date;
                if (req.fromDate.includes('/')) {
                    const [d, m, y] = req.fromDate.split('/').map(Number);
                    reqDate = new Date(y, m - 1, d);
                } else {
                    const [y, m, d] = req.fromDate.split('-').map(Number);
                    reqDate = new Date(y, m - 1, d);
                }

                // Check if date falls within range
                return reqDate >= fromDateObj && reqDate <= toDateObj;
            });

            console.log(`Filtered to ${filtered.length} records within date range`);

            // Sort Ascending by fromDate
            const sorted = filtered.sort((a, b) => {
                const parseDate = (d: string) => {
                    if (d.includes('/')) {
                        const [day, month, year] = d.split('/').map(Number);
                        return new Date(year, month - 1, day).getTime();
                    }
                    const [year, month, day] = d.split('-').map(Number);
                    return new Date(year, month - 1, day).getTime();
                };
                return parseDate(a.fromDate) - parseDate(b.fromDate);
            });

            setRequests(sorted);
        } catch (error) {
            console.error("Failed to fetch leave report:", error);
        } finally {
            setLoading(false);
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        // Helper to remove emojis - comprehensive regex
        const removeEmojis = (text: string) => {
            // Remove all emoji characters including variation selectors
            return text
                .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
                .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
                .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
                .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
                .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (includes ⛱️)
                .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
                .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
                .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
                .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
                .trim();
        };

        const headers = ['Employee Name', 'Submitted On', 'From', 'To', 'Leave', 'Leave Type', 'Reason', 'Status', 'Approving Manager'];
        const rows = visibleRequests.map(req => [
            req.employeeName,
            formatDate(req.submittedOn),
            req.fromDate,
            req.toDate,
            req.leaveDuration,
            removeEmojis(req.leaveType), // Strip emojis for Excel compatibility
            req.reason,
            req.status,
            req.manager
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Leave_History_Report_${dateFrom}_to_${dateTo}.csv`;
        link.click();
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    };

    // Helper for badges
    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('approved')) return 'bg-emerald-100 text-emerald-700';
        if (s.includes('reject')) return 'bg-red-100 text-red-700';
        if (s.includes('pending')) return 'bg-amber-100 text-amber-700';
        return 'bg-slate-100 text-slate-600';
    };

    // Filter requests based on Search Term
    const visibleRequests = requests.filter(req =>
        req.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-slate-50 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Leave History Report</h1>
                    <p className="text-slate-500 text-sm mt-1">Comprehensive record of all leave requests with overlapping month support.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <FaSearch className="text-slate-400 text-xs" />
                        <input
                            type="text"
                            placeholder="Filter by Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 p-0 w-32"
                        />
                    </div>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">From</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 p-0"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 p-0"
                        />
                    </div>
                    <button
                        onClick={fetchReport}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Search"
                    >
                        <FaSearch />
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                        title="Export to Excel"
                    >
                        <FaFileExcel /> Export
                    </button>

                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee Name</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">From</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">To</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leave</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Manager</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <p className="text-sm font-medium">Loading report data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : visibleRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        <p className="text-sm">No leave requests found for the selected period.</p>
                                    </td>
                                </tr>
                            ) : (
                                visibleRequests.map((req, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                                                    {req.employeeName.charAt(0)}
                                                </div>
                                                <span className="text-xs text-slate-700 whitespace-nowrap">
                                                    {req.employeeName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                                {formatDate(req.submittedOn)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center text-[11px] text-indigo-600 whitespace-nowrap">
                                            {req.fromDate}
                                        </td>
                                        <td className="px-4 py-2 text-center text-[11px] text-indigo-600 whitespace-nowrap">
                                            {req.toDate}
                                        </td>
                                        <td className="px-4 py-2 text-center text-[11px] text-slate-600 whitespace-nowrap">
                                            {req.leaveDuration === 'N/A' ? 'N/A' : req.leaveDuration}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100 whitespace-nowrap">
                                                {req.leaveType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center text-[11px] text-slate-500 max-w-[180px] truncate" title={req.reason}>
                                            {req.reason}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(req.status)} whitespace-nowrap`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center text-[11px] text-slate-600 whitespace-nowrap">
                                            {req.manager}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
