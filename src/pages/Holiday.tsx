import React, { useEffect, useState } from 'react';
import { SharePointService } from '../services/sharePointService';
import type { Holiday as SPHoliday } from '../types/attendance';

interface Holiday {
    date: string;
    day: string;
    event: string;
    rawDate: Date; // Keep raw date for sorting
}

interface RegionalHolidays {
    usa: Holiday[];
    canada: Holiday[];
    apac: Holiday[];
}

export const Holiday: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [holidays, setHolidays] = useState<RegionalHolidays>({
        usa: [],
        canada: [],
        apac: []
    });

    useEffect(() => {
        const fetchHolidays = async () => {
            setLoading(true);
            try {
                // Fetch all 3 regions in parallel
                const [usaData, canadaData, apacData] = await Promise.all([
                    SharePointService.getUSAHolidays(),
                    SharePointService.getCanadaHolidays(),
                    SharePointService.getAPACHolidays()
                ]);

                console.log("USA Data:", usaData);
                console.log("Canada Data:", canadaData);
                console.log("APAC Data:", apacData);

                const formatData = (data: SPHoliday[]): Holiday[] => {
                    if (!data || !Array.isArray(data)) return [];

                    const validItems = data.filter((item: SPHoliday) => {
                        // Service returns 'date' property
                        return item.date != null;
                    });

                    const formatted = validItems.map((item: SPHoliday) => {
                        // Service returns 'date' and 'title'
                        const dateStr = item.date;
                        const date = new Date(dateStr);

                        return {
                            date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }), // "25 December"
                            day: date.toLocaleDateString('en-US', { weekday: 'long' }), // "Thursday"
                            event: item.title,
                            rawDate: date
                        };
                    });

                    // Sort by date ascending
                    return formatted.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
                };

                setHolidays({
                    usa: formatData(usaData),
                    canada: formatData(canadaData),
                    apac: formatData(apacData)
                });

            } catch (error) {
                console.error("Failed to fetch holidays", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHolidays();
    }, []);

    const renderColumnObject = (title: string, icon: string, data: Holiday[]) => (
        <div className="bg-white rounded-2xl border-2 border-blue-400 p-6 shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-center gap-3 mb-6">
                <img src={icon} alt={title} className="w-16 h-16 object-contain" />
                <h2 className="text-xl font-semibold text-blue-700">
                    {title}
                </h2>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-blue-200">
                        <th className="text-left py-2 px-2 text-sm font-semibold text-blue-700">Date</th>
                        <th className="text-left py-2 px-2 text-sm font-semibold text-blue-700">Day</th>
                        <th className="text-left py-2 px-2 text-sm font-semibold text-blue-700">Event</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                                <span className="inline-block animate-pulse">Loading holidays...</span>
                            </td>
                        </tr>
                    ) : data.length > 0 ? (
                        data.map((holiday, index) => (
                            <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors">
                                <td className="py-3 px-2 text-sm text-gray-700">{holiday.date}</td>
                                <td className="py-3 px-2 text-sm text-gray-700">{holiday.day}</td>
                                <td className="py-3 px-2 text-sm text-gray-700">{holiday.event}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={3} className="py-8 text-center text-sm text-gray-400 italic">
                                No holidays found for this region.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-700 mb-4">{new Date().getFullYear()}</h1>
                <p className="text-blue-700 font-medium">
                    Below is a list of our company's paid holidays during which our offices will be closed for observance.
                </p>
            </div>

            {/* 3 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {renderColumnObject("U.S.A Shift Holiday", "/usa-map.png", holidays.usa)}
                {renderColumnObject("Canada Shift Holiday", "/canada-map.png", holidays.canada)}
                {renderColumnObject("APAC Shift Holiday", "/apac-map.png", holidays.apac)}
            </div>
        </div>
    );
};
