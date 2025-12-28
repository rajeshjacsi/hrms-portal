import React, { useState, useMemo } from 'react';
import { FaCalendarCheck } from 'react-icons/fa';
import type { AttendanceRecord } from '../types/attendance';

interface DashboardCalendarProps {
    records: AttendanceRecord[];
    currentDate?: Date; // Defaults to now if not provided
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ records, currentDate = new Date() }) => {
    const [displayDate] = useState(currentDate);

    // Helpers to get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const daysInMonth = getDaysInMonth(displayDate);
    const firstDay = getFirstDayOfMonth(displayDate);
    const monthName = displayDate.toLocaleString('default', { month: 'long' });
    const year = displayDate.getFullYear();

    // Map records to dates for easy lookup
    // Format: "DD/MM/YYYY" -> Record
    const recordMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        records.forEach(r => {
            // Ensure we handle date formats consistently. assuming DD/MM/YYYY from SharePoint
            map.set(r.date, r);
        });
        return map;
    }, [records]);

    const getStatusStyle = (status?: string) => {
        if (!status) return {};
        const lowerStatus = status.toLowerCase();

        // Yellow for Checked In (IN) or Half Day
        if (lowerStatus === 'in' || lowerStatus === 'checked in' || lowerStatus === 'half-day' || lowerStatus === 'half day') {
            return { bg: 'bg-yellow-500', text: 'text-white' };
        }

        // Green for Present, On Time
        if (lowerStatus === 'present' || lowerStatus === 'on time') {
            return { bg: 'bg-green-500', text: 'text-white' };
        }

        // Red for Absent/Leave
        if (lowerStatus === 'absent' || lowerStatus.includes('leave')) return { bg: 'bg-red-500', text: 'text-white' };

        // Blue for Holiday
        if (lowerStatus === 'holiday') return { bg: 'bg-blue-500', text: 'text-white' };

        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    };

    const getDayContent = (day: number) => {
        const dateStr = `${day.toString().padStart(2, '0')}/${(displayDate.getMonth() + 1).toString().padStart(2, '0')}/${year}`;
        const record = recordMap.get(dateStr);
        const isToday =
            day === new Date().getDate() &&
            displayDate.getMonth() === new Date().getMonth() &&
            displayDate.getFullYear() === new Date().getFullYear();

        const statusStyle = record ? getStatusStyle(record.status) : null;
        const isWeekend = new Date(year, displayDate.getMonth(), day).getDay() === 0 || new Date(year, displayDate.getMonth(), day).getDay() === 6;

        return {
            dateStr,
            record,
            isToday,
            statusStyle,
            isWeekend
        };
    };

    const days = [];
    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const { record, statusStyle, isWeekend } = getDayContent(day);

        // Calculate grid position to determine tooltip alignment
        // The grid includes empty cells at the start (firstDay)
        const gridIndex = firstDay + day - 1;
        const colIndex = gridIndex % 7;

        let tooltipClass = 'left-1/2 transform -translate-x-1/2'; // Default Center
        let arrowClass = 'left-1/2 transform -translate-x-1/2';

        if (colIndex === 0 || colIndex === 1) {
            // Left side (Sun, Mon) - Align Left
            tooltipClass = 'left-0 transform translate-x-[-10%]'; // Slight offset to ensure not cut off
            arrowClass = 'left-5';
        } else if (colIndex === 5 || colIndex === 6) {
            // Right side (Fri, Sat) - Align Right
            tooltipClass = 'right-0 transform translate-x-[10%]';
            arrowClass = 'right-5';
        }

        // Determine effective style
        let effectiveStyle = '';
        if (statusStyle && statusStyle.bg) {
            effectiveStyle = `${statusStyle.bg} ${statusStyle.text} shadow-sm`;
        } else if (isWeekend) {
            effectiveStyle = 'bg-blue-500 text-white shadow-sm';
        } else {
            effectiveStyle = 'text-gray-700 hover:bg-gray-100';
        }

        days.push(
            <div key={day} className="relative group">
                <div
                    className={`
                        h-10 w-10 mx-auto flex items-center justify-center rounded-full text-sm font-bold transition-all duration-200 cursor-default
                        ${effectiveStyle}
                    `}
                >
                    {day}
                </div>

                {/* Tooltip Popup */}
                {record && (
                    <div className={`absolute z-50 bottom-full mb-2 hidden group-hover:block w-32 bg-white rounded-lg shadow-xl border border-gray-100 p-2 animate-fade-in-up ${tooltipClass}`}>
                        <div className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider text-center">{record.date}</div>
                        <div className={`text-center font-bold mb-2 ${(() => {
                            const s = record.status?.trim().toLowerCase() || ''; // Added .trim()
                            if (s === 'present' || s === 'on time') return 'text-green-600';
                            if (s === 'in' || s === 'checked in' || s === 'half-day' || s === 'half day') return 'text-yellow-500';
                            if (s === 'absent') return 'text-red-500';
                            if (s === 'holiday') return 'text-blue-500';
                            if (s.includes('leave')) return 'text-purple-500';
                            return 'text-gray-700';
                        })()}`}>
                            {(() => {
                                const s = record.status?.trim().toLowerCase() || ''; // Added .trim()
                                if (s === 'in' || s === 'checked in' || s === 'half-day' || s === 'half day') return 'Half Day';
                                return record.status;
                            })()}
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">In:</span>
                                <span className="font-mono font-medium text-gray-800">{record.checkInTime || '--:--'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Out:</span>
                                <span className="font-mono font-medium text-gray-800">{record.checkOutTime || '--:--'}</span>
                            </div>
                        </div>

                        {/* Little triangle arrow */}
                        <div className={`absolute top-full border-8 border-transparent border-t-white ${arrowClass}`}></div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Calendar Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FaCalendarCheck className="text-blue-500" />
                    {monthName} <span className="text-gray-400 font-normal">{year}</span>
                </h3>
                {/* 
                  Navigation could go here, but for now we just show current month as requested.
                  If user wants to navigate, we'd need state and data fetching for other months.
                 */}
            </div>

            <div className="p-5">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-2">
                    {days}
                </div>
            </div>

            {/* Legend / Footer */}
            <div className="mt-auto p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Half Day
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Present
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Absent/Leave
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Holiday/Weekend
                </div>
            </div>
        </div>
    );
};
