import React from 'react';
import { FaUserCircle, FaBars, FaBell, FaCheck } from 'react-icons/fa';
import { useUser } from '../context/UserContext';
import { SharePointService } from '../services/sharePointService';
import type { AppNotification } from '../types/attendance';

export const Header: React.FC = () => {
    const { employee, permissionLevel } = useUser();
    const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
    const [showNotifications, setShowNotifications] = React.useState(false);

    React.useEffect(() => {
        if (!employee?.email) return;

        const fetchNotifications = async () => {
            try {
                const data = await SharePointService.getNotifications(employee.email);
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [employee?.email]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await SharePointService.markNotificationAsRead(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    return (
        <header className="bg-blue-50 text-gray-900 shadow-sm border-b border-blue-100 h-16 flex items-center justify-between px-6 relative z-50">
            <div className="flex items-center gap-4">
                <button className="md:hidden text-gray-600 hover:text-gray-900">
                    <FaBars size={20} />
                </button>
                {/* Mobile Logo / Title */}
                <span className="md:hidden font-semibold text-lg tracking-wide text-gray-900">HRMS Portal</span>

            </div>

            <div className="flex items-center gap-6">
                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition relative"
                    >
                        <FaBell size={20} />
                        {notifications.length > 0 && (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
                            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <h4 className="font-bold text-gray-800 text-sm">Notifications</h4>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                                    {notifications.length} New
                                </span>
                            </div>
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FaBell className="text-gray-300" size={20} />
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium">No new notifications</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {notifications.map(n => (
                                            <div key={n.id} className="p-4 hover:bg-indigo-50/30 transition group relative">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                        {n.senderName ? n.senderName.charAt(0) : '?'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-800 leading-relaxed pr-6">
                                                            <span className="font-bold">{n.senderName}</span> {n.message || n.title}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleMarkAsRead(n.id)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition"
                                                    title="Mark as read"
                                                >
                                                    <FaCheck size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                                    <button
                                        onClick={() => setShowNotifications(false)}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-3 pl-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium text-gray-900 leading-none">{employee?.name || 'Guest'}</div>
                        <div className="text-[10px] text-gray-500 font-bold opacity-60 mt-1 uppercase tracking-tighter">{permissionLevel || 'Employee'}</div>
                    </div>
                    <FaUserCircle size={32} className="text-gray-400 cursor-pointer hover:text-indigo-600 transition" />
                </div>
            </div>
        </header>
    );
};
