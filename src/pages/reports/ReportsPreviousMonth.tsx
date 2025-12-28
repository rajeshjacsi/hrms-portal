import { useState } from 'react';
import { FaFolder, FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import { NotificationModal } from '../../components/NotificationModal';

export const ReportsPreviousMonth = () => {
    // Ascending order as requested: 2023 -> 2025
    const years = ['2024', '2025', '2026', '2027'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // State to track drill-down
    const [selectedYear, setSelectedYear] = useState<string | null>(null);

    // Notification State
    const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const handleYearClick = (year: string) => {
        setSelectedYear(year);
    };

    const handleBackClick = () => {
        setSelectedYear(null);
    };

    const handleMonthClick = (month: string) => {
        // Future: Navigate to actual report for that month/year
        setNotification({
            isOpen: true,
            type: 'success',
            title: 'Feature Coming Soon',
            message: `Opening report for ${month} ${selectedYear} (Feature coming soon)`
        });
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header with Breadcrumb */}
            <div className="flex items-center gap-4">
                {selectedYear && (
                    <button
                        onClick={handleBackClick}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Back to Years"
                    >
                        <FaArrowLeft />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {selectedYear ? (
                            <>
                                <span className="text-gray-400 font-normal cursor-pointer hover:text-blue-600 hover:underline" onClick={handleBackClick}>Previous Month Report</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-blue-600">{selectedYear}</span>
                            </>
                        ) : 'Previous Month Report'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {selectedYear
                            ? `Viewing monthly archives for ${selectedYear}`
                            : 'Select a year to view archived attendance reports.'}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex-1">
                {!selectedYear ? (
                    // YEAR SELECTION VIEW
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {years.map((year) => (
                            <div
                                key={year}
                                onClick={() => handleYearClick(year)}
                                className="group cursor-pointer flex flex-col items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-all duration-300"
                            >
                                <div className="relative">
                                    <FaFolder className="text-6xl text-yellow-400 group-hover:text-yellow-500 transition-colors drop-shadow-md group-hover:drop-shadow-lg transform group-hover:-translate-y-1 transition-transform" />
                                    <div className="absolute inset-0 flex items-center justify-center pt-2">
                                        <span className="text-[10px] font-bold text-yellow-700/50 opacity-0 group-hover:opacity-100 transition-opacity">OPEN</span>
                                    </div>
                                </div>
                                <span className="font-bold text-xl text-gray-700 group-hover:text-blue-700 transition-colors">{year}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    // MONTH SELECTION VIEW (Landing Page for Year)
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 animate-in fade-in zoom-in-95 duration-300">
                        {months.map((month) => (
                            <div
                                key={month}
                                onClick={() => handleMonthClick(month)}
                                className="group cursor-pointer bg-gray-50 hover:bg-white border border-transparent hover:border-blue-200 hover:shadow-lg p-4 rounded-xl flex flex-col items-start gap-3 transition-all duration-200"
                            >
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <FaCalendarAlt className="text-xl" />
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{selectedYear}</span>
                                    <span className="block font-bold text-gray-800 text-lg group-hover:text-blue-700 transition-colors">{month}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
