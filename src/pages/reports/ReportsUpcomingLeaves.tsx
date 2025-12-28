import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaArrowLeft,
    FaSearch,
    FaPlus,
    FaEdit,
    FaTrash,
    FaSave,
    FaTimes
} from 'react-icons/fa';
import { SharePointService } from '../../services/sharePointService';
import type { UpcomingLeaveRecord } from '../../types/attendance';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../../components/ConfirmModal';

export const ReportsUpcomingLeaves = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState<UpcomingLeaveRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState<Omit<UpcomingLeaveRecord, 'id'>>({
        employeeName: '',
        date: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await SharePointService.getAllUpcomingLeaves();
            setRecords(data);
        } catch (error) {
            console.error("Failed to fetch upcoming leaves", error);
            toast.error('Failed to load upcoming leaves');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setIsEditing(false);
        setCurrentRecordId(null);
        setFormData({
            employeeName: '',
            date: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: UpcomingLeaveRecord) => {
        setIsEditing(true);
        setCurrentRecordId(record.id);
        setFormData({
            employeeName: record.employeeName,
            date: record.date
        });
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setRecordToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!recordToDelete) return;
        try {
            await SharePointService.deleteUpcomingLeave(recordToDelete);
            toast.success('Leave record deleted successfully');
            fetchRecords();
        } catch (error) {
            console.error("Failed to delete record", error);
            toast.error('Failed to delete record');
        } finally {
            setDeleteModalOpen(false);
            setRecordToDelete(null);
        }
    };

    const handleSave = async () => {
        if (!formData.employeeName?.trim() || !formData.date?.trim()) {
            toast.error('Name and Date are required');
            return;
        }

        setSaving(true);
        try {
            if (isEditing && currentRecordId) {
                await SharePointService.updateUpcomingLeave(currentRecordId, formData);
                toast.success('Leave updated successfully');
            } else {
                await SharePointService.addUpcomingLeave(formData);
                toast.success('Leave added successfully');
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (error) {
            console.error("Failed to save record", error);
            toast.error('Failed to save record');
        } finally {
            setSaving(false);
        }
    };

    const filteredRecords = records.filter(record =>
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/reports')}
                            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Upcoming Leaves</h1>
                            <p className="text-sm text-gray-500">Manage projected leave schedules</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <FaPlus /> Add Leave
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="relative max-w-md">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                    <th className="px-6 py-4">Employee Name</th>
                                    <th className="px-6 py-4">Date(s)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            <div className="animate-pulse flex justify-center items-center gap-2">
                                                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                                                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            No upcoming leaves found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {record.employeeName}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {record.date}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(record.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditing ? 'Edit Leave Record' : 'Add New Leave'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
                                <input
                                    type="text"
                                    value={formData.employeeName}
                                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Enter employee name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date(s) *</label>
                                <input
                                    type="text"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. 29 December - 31 December"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        Save Record
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Leave Record"
                message="Are you sure you want to delete this leave record? This action cannot be undone."
                confirmText="Delete Record"
                cancelText="Cancel"
                isDestructive={true}
            />
        </div>
    );
};
