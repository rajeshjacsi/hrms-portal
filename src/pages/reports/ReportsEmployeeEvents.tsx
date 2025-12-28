
import { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import type { EmployeeEventRecord } from '../../types/attendance';
import { FaEdit, FaSearch, FaSync, FaSave, FaTimes, FaTrash, FaPlus, FaUser } from 'react-icons/fa';
import { NotificationModal } from '../../components/NotificationModal';
import { ConfirmModal } from '../../components/ConfirmModal';

export const ReportsEmployeeEvents = () => {
    const [records, setRecords] = useState<EmployeeEventRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<EmployeeEventRecord | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState<Omit<EmployeeEventRecord, 'id'>>({
        name: '',
        email: '',
        dob: '',
        workAnniversary: '',
        personalId: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Notification State
    const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: EmployeeEventRecord | null }>({
        isOpen: false,
        item: null
    });

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await SharePointService.getAllEmployeeEventRecords();
            // Sort by name alphabetically
            const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));
            setRecords(sortedData);
        } catch (error) {
            console.error("Failed to fetch employee event records", error);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Fetch Failed',
                message: 'Failed to retrieve employee records. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: EmployeeEventRecord) => {
        setEditingItem({ ...item });
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        setSubmitting(true);
        try {
            await SharePointService.updateEmployeeEventRecord(editingItem.id, {
                name: editingItem.name,
                email: editingItem.email,
                dob: editingItem.dob,
                workAnniversary: editingItem.workAnniversary,
                personalId: editingItem.personalId
            });
            setSuccessMessage(`Updated record for ${editingItem.name} successfully!`);
            setEditingItem(null);
            await fetchRecords();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update record. Please try again.';
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdd = async () => {
        if (!newItem.name || !newItem.email) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Incomplete Data',
                message: 'Please provide at least a name and email.'
            });
            return;
        }
        setSubmitting(true);
        try {
            await SharePointService.addEmployeeEventRecord(newItem);
            setSuccessMessage(`Added record for ${newItem.name} successfully!`);
            setIsAddModalOpen(false);
            setNewItem({ name: '', email: '', dob: '', workAnniversary: '', personalId: '' });
            await fetchRecords();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to add record. Please try again.';
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Add Failed',
                message
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (item: EmployeeEventRecord) => {
        setDeleteConfirm({ isOpen: true, item });
    };

    const handleConfirmDelete = async () => {
        const item = deleteConfirm.item;
        if (!item) return;

        console.log("ReportsEmployeeEvents: Delete confirmed for", item.name, "ID:", item.id);
        setLoading(true);
        console.log("ReportsEmployeeEvents: Calling deleteEmployeeEventRecord...");

        try {
            await SharePointService.deleteEmployeeEventRecord(item.id);
            console.log("ReportsEmployeeEvents: Deletion V2 successful");
            setSuccessMessage(`Deleted record for ${item.name} successfully!`);
            await fetchRecords();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error: unknown) {
            console.error("ReportsEmployeeEvents: Delete operation failed", error);
            const message = error instanceof Error ? error.message : 'Failed to delete record.';
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Delete Failed',
                message
            });
        } finally {
            setLoading(false);
            setDeleteConfirm({ isOpen: false, item: null });
        }
    };

    const filteredRecords = records.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 sticky top-0 z-20 bg-slate-50 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Employee DOB & Work Anniv</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                    >
                        <FaPlus />
                        Add New Record
                    </button>
                    <button
                        onClick={fetchRecords}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-4 rounded-r-lg shadow-sm animate-slideIn">
                    <p className="text-emerald-700 text-sm flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                        {successMessage}
                    </p>
                </div>
            )}

            <div className="flex-1 flex items-start justify-center overflow-hidden">
                <div className="w-full max-w-7xl flex flex-col" style={{ height: '100%' }}>
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col flex-1">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-left">Employee Name</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-left">Official Email</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-left">Personal ID</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center">Date of Birth</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center">Work Anniversary</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24 mx-auto"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24 mx-auto"></div></td>
                                                <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-20 ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredRecords.length > 0 ? (
                                        filteredRecords.map((item) => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                                            <FaUser className="text-xs" />
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-gray-500">{item.email}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-gray-500">{item.personalId}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-medium italic">
                                                        {item.dob ? new Date(item.dob).toLocaleDateString('en-GB') : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium italic">
                                                        {item.workAnniversary ? new Date(item.workAnniversary).toLocaleDateString('en-GB') : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition-all"
                                                            title="Edit"
                                                        >
                                                            <FaEdit className="text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(item)}
                                                            className="p-2 bg-rose-600 text-white rounded shadow hover:bg-rose-700 transition-all"
                                                            title="Delete"
                                                        >
                                                            <FaTrash className="text-sm" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-medium italic">
                                                No employee records found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add/Edit Modal */}
                    {(editingItem || isAddModalOpen) && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-65 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn border border-gray-100">
                                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex items-center justify-between">
                                    <h3 className="font-black text-xl tracking-tight">
                                        {isAddModalOpen ? 'Add New Employee Record' : 'Update Employee Information'}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setEditingItem(null);
                                            setIsAddModalOpen(false);
                                        }}
                                        className="text-white hover:text-blue-100 transition-colors p-1"
                                    >
                                        <FaTimes className="text-2xl" />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Employee Name</label>
                                            <input
                                                type="text"
                                                value={isAddModalOpen ? newItem.name : editingItem?.name}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (isAddModalOpen) setNewItem({ ...newItem, name: val });
                                                    else if (editingItem) setEditingItem({ ...editingItem, name: val });
                                                }}
                                                placeholder="e.g. John Doe"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Official Email</label>
                                            <input
                                                type="email"
                                                value={isAddModalOpen ? newItem.email : editingItem?.email}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (isAddModalOpen) setNewItem({ ...newItem, email: val });
                                                    else if (editingItem) setEditingItem({ ...editingItem, email: val });
                                                }}
                                                placeholder="email@example.com"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Personal ID / Email</label>
                                            <input
                                                type="text"
                                                value={isAddModalOpen ? newItem.personalId : editingItem?.personalId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (isAddModalOpen) setNewItem({ ...newItem, personalId: val });
                                                    else if (editingItem) setEditingItem({ ...editingItem, personalId: val });
                                                }}
                                                placeholder="personal@email.com"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    value={isAddModalOpen ? newItem.dob : (editingItem?.dob ? new Date(editingItem.dob).toISOString().split('T')[0] : '')}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (isAddModalOpen) setNewItem({ ...newItem, dob: val });
                                                        else if (editingItem) setEditingItem({ ...editingItem, dob: val });
                                                    }}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Work Anniversary</label>
                                                <input
                                                    type="date"
                                                    value={isAddModalOpen ? newItem.workAnniversary : (editingItem?.workAnniversary ? new Date(editingItem.workAnniversary).toISOString().split('T')[0] : '')}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (isAddModalOpen) setNewItem({ ...newItem, workAnniversary: val });
                                                        else if (editingItem) setEditingItem({ ...editingItem, workAnniversary: val });
                                                    }}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                                    <button
                                        onClick={() => {
                                            setEditingItem(null);
                                            setIsAddModalOpen(false);
                                        }}
                                        className="flex-1 py-3.5 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={isAddModalOpen ? handleAdd : handleUpdate}
                                        disabled={submitting}
                                        className="flex-1 py-3.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <FaSync className="animate-spin text-sm" /> : <FaSave className="text-sm" />}
                                        {submitting ? 'Processing...' : (isAddModalOpen ? 'Create Record' : 'Save Changes')}
                                    </button>
                                </div>
                            </div>
                        </div>
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

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Delete Employee Record"
                message={`Are you sure you want to delete the record for ${deleteConfirm.item?.name}? This action cannot be undone.`}
                confirmText="Delete Record"
                isDestructive={true}
            />
        </div>
    );
};
