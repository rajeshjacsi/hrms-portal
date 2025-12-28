import React, { useEffect, useState } from 'react';
import { FaCog, FaPlus, FaTrash } from 'react-icons/fa';
import { SharePointService } from '../services/sharePointService';
import type { Shift } from '../types/attendance';
import { NotificationModal } from '../components/NotificationModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TIME_ZONES, getTimeZoneLabel } from '../utils/timeZones';

export const Settings: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Notification Modal State
    const [notifyConfig, setNotifyConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const [newShift, setNewShift] = useState({
        name: '',
        startTime: '',
        endTime: '',
        timeZone: 'Asia/Kolkata'
    });

    useEffect(() => {
        loadShifts();
    }, []);

    const showNotification = (type: 'success' | 'error', title: string, message: string) => {
        setNotifyConfig({ isOpen: true, type, title, message });
    };

    const loadShifts = async () => {
        try {
            setLoading(true);
            const data = await SharePointService.getAllShifts();
            setShifts(data);
        } catch (err: any) {
            setError('Failed to load shifts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddShift = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await SharePointService.addShift(newShift);
            setNewShift({ name: '', startTime: '', endTime: '', timeZone: 'Asia/Kolkata' });
            loadShifts();
            showNotification('success', 'Success!', 'Shift has been added successfully.');
        } catch (err: any) {
            showNotification('error', 'Error', 'Failed to add shift: ' + err.message);
        }
    };

    const confirmDelete = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Shift?',
            message: 'Are you sure you want to permanently remove this shift definition?',
            onConfirm: () => executeDelete(id)
        });
    };

    const executeDelete = async (id: string) => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false })); // Close confirm modal
        try {
            await SharePointService.deleteShift(id);
            loadShifts();
            showNotification('success', 'Deleted', 'Shift has been removed successfully.');
        } catch (err: any) {
            showNotification('error', 'Error', 'Failed to delete shift: ' + err.message);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <NotificationModal
                isOpen={notifyConfig.isOpen}
                onClose={() => setNotifyConfig(prev => ({ ...prev, isOpen: false }))}
                type={notifyConfig.type}
                title={notifyConfig.title}
                message={notifyConfig.message}
            />

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
            />

            <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                <FaCog /> Settings
            </h1>

            {/* Shift Management Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Shift Management</h2>

                {/* Add Shift Form */}
                <form onSubmit={handleAddShift} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Shift Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Morning Shift"
                            className="w-full p-2 border rounded"
                            value={newShift.name}
                            onChange={e => setNewShift({ ...newShift, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start (24h)</label>
                        <input
                            type="time"
                            required
                            className="w-full p-2 border rounded"
                            value={newShift.startTime}
                            onChange={e => setNewShift({ ...newShift, startTime: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End (24h)</label>
                        <input
                            type="time"
                            required
                            className="w-full p-2 border rounded"
                            value={newShift.endTime}
                            onChange={e => setNewShift({ ...newShift, endTime: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Time Zone</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={newShift.timeZone}
                            onChange={e => setNewShift({ ...newShift, timeZone: e.target.value })}
                        >
                            {TIME_ZONES.map(tz => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-5 flex justify-end">
                        <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                            <FaPlus /> Add Shift
                        </button>
                    </div>
                </form>

                {/* Shift List */}
                {loading ? (
                    <p className="text-gray-500 text-center py-4">Loading shifts...</p>
                ) : error ? (
                    <p className="text-red-500 text-center">{error}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-500 text-sm border-b">
                                    <th className="p-3 font-medium">Name</th>
                                    <th className="p-3 font-medium">Timings</th>
                                    <th className="p-3 font-medium">Time Zone</th>
                                    <th className="p-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map(shift => (
                                    <tr key={shift.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-3 font-medium">{shift.name}</td>
                                        <td className="p-3">{shift.startTime} - {shift.endTime}</td>
                                        <td className="p-3 text-gray-600 font-mono text-sm">{getTimeZoneLabel(shift.timeZone || 'Asia/Kolkata')}</td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => confirmDelete(shift.id)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                                title="Delete Shift"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {shifts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-gray-400">No shifts defined yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
