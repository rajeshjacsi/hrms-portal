import React, { useEffect, useState } from 'react';
import { SharePointService } from '../services/sharePointService';
import { FaSync, FaClock, FaCheckCircle, FaTimesCircle, FaSearch } from 'react-icons/fa';

interface AttendanceRecord {
    id: string;
    name: string;
    place: string;
    checkInTime: string;
    checkOutTime: string;
    workingHours: string;
    status: string;
}

export const MyTeam: React.FC = () => {
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedPlace, setSelectedPlace] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    const places = ['All', 'Chennai', 'Hyderabad', 'Noida', 'CON', 'Canada'];

    const placeColors: Record<string, string> = {
        'Chennai': 'bg-indigo-500 hover:bg-indigo-600',
        'Hyderabad': 'bg-purple-500 hover:bg-purple-600',
        'Noida': 'bg-teal-500 hover:bg-teal-600',
        'CON': 'bg-orange-500 hover:bg-orange-600',
        'Canada': 'bg-red-500 hover:bg-red-600',
        'All': 'bg-gray-600 hover:bg-gray-700'
    };

    const fetchAttendanceData = async (date: Date) => {
        try {
            setLoading(true);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const dateStr = `${day}/${month}/${year}`;

            // Fetch employees and attendance
            const [employeesList, attendance] = await Promise.all([
                SharePointService.getAllEmployees(),
                SharePointService.getAllAttendanceForDate(dateStr)
            ]);

            // Only show actual attendance records for team members (excluding IT, Accounts, HR)
            const mergedData = attendance
                .filter((record: any) => {
                    const emp = employeesList.find(e => e.id === record.employeeId || e.name === record.name);
                    return emp && !['Information Technology', 'Accounts', 'HR'].includes(emp.department);
                })
                .map((record: any) => {
                    const emp = employeesList.find(e => e.id === record.employeeId || e.name === record.name);
                    return {
                        id: record.id,
                        name: record.name || (emp ? emp.name : 'Unknown'),
                        place: record.place || (emp ? emp.place : 'N/A'),
                        checkInTime: record.checkInTime || '-',
                        checkOutTime: record.checkOutTime || '-',
                        workingHours: record.workingHours || '-',
                        status: record.status || 'Present'
                    };
                });

            setAttendanceRecords(mergedData);
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendanceData(selectedDate);
    }, [selectedDate]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    };

    const handleRefresh = () => {
        fetchAttendanceData(selectedDate);
    };

    // Filter records by selected place and search term
    const filteredRecords = attendanceRecords.filter(record => {
        const matchesPlace = selectedPlace === 'All' || record.place?.toLowerCase() === selectedPlace.toLowerCase();
        const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesPlace && matchesSearch;
    });

    // Calculate stats
    const stats = {
        total: filteredRecords.length,
        present: filteredRecords.filter(r => r.status === 'IN').length,
        absent: filteredRecords.filter(r => r.status === 'Absent').length,
        onLeave: filteredRecords.filter(r => r.status.includes('Leave') || r.status.includes('Holiday')).length
    };

    const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="h-full flex flex-col p-6 gap-6 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white flex-shrink-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">My Team Attendance</h1>
                        <p className="text-blue-100 text-sm">{formatDisplayDate(selectedDate)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Date Picker */}
                        <div className="relative">
                            <input
                                type="date"
                                value={formatDateForInput(selectedDate)}
                                onChange={handleDateChange}
                                className="px-4 py-2 rounded-lg bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-md"
                            />
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            className="p-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-md"
                            title="Refresh"
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500 font-medium">Total Team Records</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500 font-medium">Available</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.present}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                    <p className="text-sm text-gray-500 font-medium">Absent</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.absent}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500 font-medium">On Leave</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.onLeave}</p>
                </div>
            </div>

            {/* Place Filter & Search */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex-shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-600 mb-3">Filter by Location</p>
                        <div className="flex flex-wrap gap-2">
                            {places.map(place => (
                                <button
                                    key={place}
                                    onClick={() => setSelectedPlace(place)}
                                    className={`px-4 py-2 rounded-lg font-medium text-white transition-all shadow-sm ${selectedPlace === place
                                        ? placeColors[place] + ' ring-2 ring-offset-2 ring-gray-400'
                                        : placeColors[place] + ' opacity-60'
                                        }`}
                                >
                                    {place}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="md:w-64">
                        <p className="text-sm font-semibold text-gray-600 mb-3">Search Employee</p>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 h-full">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-500">Loading attendance data...</p>
                            </div>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <p className="text-lg font-medium">No records found</p>
                            <p className="text-sm mt-2">Try selecting a different date or location</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Employee Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Check In
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Check Out
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Hours
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.map((record, index) => (
                                    <tr
                                        key={record.id || index}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${record.status === 'Absent'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-indigo-100 text-indigo-600'
                                                    }`}>
                                                    {record.name?.charAt(0) || '?'}
                                                </div>
                                                <span className="font-medium text-gray-800">{record.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                                {record.place}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {record.checkInTime !== '-' && (
                                                    <FaClock className="text-green-500 text-sm" />
                                                )}
                                                <span className={`font-mono text-sm ${record.checkInTime !== '-'
                                                    ? 'text-green-600 font-semibold'
                                                    : 'text-gray-400'
                                                    }`}>
                                                    {record.checkInTime}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {record.checkOutTime !== '-' && (
                                                    <FaClock className="text-red-500 text-sm" />
                                                )}
                                                <span className={`font-mono text-sm ${record.checkOutTime !== '-'
                                                    ? 'text-red-600 font-semibold'
                                                    : 'text-gray-400'
                                                    }`}>
                                                    {record.checkOutTime}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-gray-700 font-medium">
                                                {record.workingHours}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${['Present', 'On Time'].includes(record.status)
                                                ? 'bg-green-100 text-green-700'
                                                : record.status === 'Late'
                                                    ? 'bg-red-100 text-red-700'
                                                    : ['Half-Day', 'Half Day', 'In', 'Checked In'].includes(record.status)
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : record.status === 'Absent'
                                                            ? 'bg-red-50 text-red-600'
                                                            : record.status.includes('Leave')
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {['Present', 'On Time'].includes(record.status) ? (
                                                    <FaCheckCircle />
                                                ) : record.status === 'Absent' ? (
                                                    <FaTimesCircle />
                                                ) : null}
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

