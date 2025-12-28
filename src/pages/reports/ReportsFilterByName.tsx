import { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import type { AttendanceRecord } from '../../types/attendance';
import { FaSearch, FaCalendarAlt, FaSpinner, FaExclamationTriangle, FaFileExcel } from 'react-icons/fa';

export const ReportsFilterByName = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize dates to current month
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
    }, []);

    const fetchAttendance = async () => {
        if (!startDate || !endDate) return;

        setLoading(true);
        setError(null);
        try {
            const records = await SharePointService.getAllAttendanceInRange(startDate, endDate);
            setAttendanceRecords(records);
        } catch (err) {
            console.error("Error fetching attendance:", err);
            setError("Failed to fetch attendance records. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch when dates change
    useEffect(() => {
        if (startDate && endDate) {
            fetchAttendance();
        }
    }, [startDate, endDate]);

    // Parse DD/MM/YYYY to Date object for sorting
    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length !== 3) return new Date(0);
        // Date(year, monthIndex, day)
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    };

    // Filter and Sort records
    const filteredRecords = attendanceRecords
        .filter(record => {
            const nameMatch = record.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
            return nameMatch;
        })
        .sort((a, b) => {
            // Sort by Date Ascending
            return parseDate(a.date).getTime() - parseDate(b.date).getTime();
        });

    const handleDownload = () => {
        if (filteredRecords.length === 0) return;

        // CSV Header
        const headers = ['Date', 'Employee Name', 'Check In', 'Check Out', 'Status', 'Working Hours'];

        // CSV Content
        const csvContent = [
            headers.join(','),
            ...filteredRecords.map(record => [
                record.date,
                `"${record.name || ''}"`,
                record.checkInTime || '',
                record.checkOutTime || '',
                record.status || '',
                record.workingHours || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'attendance_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Filter Records</h1>
                    <p className="text-gray-500 text-sm mt-1">Search and filter attendance records by employee name and date range.</p>
                </div>

                {/* Stats */}
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-blue-700 text-sm font-medium">
                    Total Records: {filteredRecords.length}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

                    {/* Search Input */}
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search by Employee Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter name..."
                            />
                        </div>
                    </div>

                    {/* Date Range - Start */}
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaCalendarAlt className="text-gray-400" />
                            </div>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Date Range - End */}
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaCalendarAlt className="text-gray-400" />
                            </div>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="md:col-span-2 flex space-x-2">
                        <button
                            onClick={fetchAttendance}
                            disabled={loading}
                            className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-sm"
                            title="Refresh Data"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : 'Refresh'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={loading || filteredRecords.length === 0}
                            className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors shadow-sm"
                            title="Download Excel"
                        >
                            <FaFileExcel className="text-lg" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center">
                    <FaExclamationTriangle className="text-red-500 mr-3" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Results Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check In
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check Out
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Working Hours
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaSpinner className="animate-spin text-3xl text-blue-500 mb-3" />
                                            <p>Loading attendance records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No records found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {record.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                    {record.name ? record.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                {record.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {record.checkInTime || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {record.checkOutTime || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                                    record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                                        record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                                                            record.status === 'Half Day' ? 'bg-orange-100 text-orange-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {record.workingHours || '-'}
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
