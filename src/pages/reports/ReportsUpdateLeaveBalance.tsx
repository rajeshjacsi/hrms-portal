
import { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import type { LeaveBalance } from '../../types/attendance';
import { FaEdit, FaSearch, FaSync, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { NotificationModal } from '../../components/NotificationModal';

export const ReportsUpdateLeaveBalance = () => {
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<LeaveBalance | null>(null);
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
        fetchBalances();
    }, []);

    const fetchBalances = async () => {
        setLoading(true);
        try {
            const data = await SharePointService.getAllLeaveBalances();
            // Sort by employee name alphabetically
            const sortedData = [...data].sort((a, b) => a.empName.localeCompare(b.empName));
            setBalances(sortedData);
        } catch (error) {
            console.error("Failed to fetch leave balances", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: LeaveBalance) => {
        setEditingItem({ ...item });
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        setSubmitting(true);
        try {
            await SharePointService.updateLeaveBalance(editingItem.id, {
                cl: editingItem.cl,
                el: editingItem.el,
                balance: editingItem.balance,
                lop: editingItem.lop
            });
            setSuccessMessage(`Updated balance for ${editingItem.empName} successfully!`);
            setEditingItem(null);
            await fetchBalances();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message: 'Failed to update leave balance. Please try again.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (item: LeaveBalance) => {
        if (!window.confirm(`Are you sure you want to delete the leave balance record for ${item.empName}?`)) return;

        setLoading(true);
        try {
            await SharePointService.deleteLeaveBalance(item.id);
            setSuccessMessage(`Deleted record for ${item.empName} successfully!`);
            await fetchBalances();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Delete Failed',
                message: 'Failed to delete leave balance record.'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredBalances = balances.filter(b =>
        b.empName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 sticky top-0 z-20 bg-slate-50 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Update Leave Balance</h1>
                <div className="flex gap-2">
                    <button
                        onClick={fetchBalances}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm animate-slideIn">
                    <p className="text-emerald-700 text-sm flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                        {successMessage}
                    </p>
                </div>
            )}

            <div className="flex-1 flex items-start justify-center overflow-hidden">
                <div className="w-full max-w-6xl flex flex-col" style={{ height: '100%' }}>
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col flex-1">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Search employee name..."
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
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-800 uppercase tracking-widest">Employee Name</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center">CL</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center">EL</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center">Balance</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center">LOP</th>
                                        <th className="px-4 py-2 text-[10px] font-bold text-gray-800 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-4 py-2"><div className="h-4 bg-gray-100 rounded w-1/2"></div></td>
                                                <td className="px-4 py-2"><div className="h-4 bg-gray-100 rounded w-10 mx-auto"></div></td>
                                                <td className="px-4 py-2"><div className="h-4 bg-gray-100 rounded w-10 mx-auto"></div></td>
                                                <td className="px-4 py-2"><div className="h-4 bg-gray-100 rounded w-10 mx-auto"></div></td>
                                                <td className="px-4 py-2"><div className="h-4 bg-gray-100 rounded w-10 mx-auto"></div></td>
                                                <td className="px-4 py-2"><div className="h-8 bg-gray-100 rounded w-20 ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : filteredBalances.length > 0 ? (
                                        filteredBalances.map((item) => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-4 py-2">
                                                    <span className="text-xs text-gray-700">{item.empName}</span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{item.cl}</span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{item.el}</span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[11px]">{item.balance}</span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded text-[11px]">{item.lop}</span>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-all"
                                                            title="Edit"
                                                        >
                                                            <FaEdit className="text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="p-1.5 bg-rose-600 text-white rounded shadow hover:bg-rose-700 transition-all"
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
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-medium">
                                                No leave balance records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Modal */}
                    {editingItem && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-65 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
                                <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
                                    <h3 className="font-black text-lg">Update Balance</h3>
                                    <button onClick={() => setEditingItem(null)} className="text-white hover:text-blue-100 transition-colors">
                                        <FaTimes className="text-xl" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-100">
                                        <span className="font-black text-gray-800 text-lg uppercase tracking-tight">{editingItem.empName}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Casual Leave (CL)</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                value={editingItem.cl}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEditingItem({ ...editingItem, cl: val, balance: val + editingItem.el });
                                                }}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Earned Leave (EL)</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                value={editingItem.el}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEditingItem({ ...editingItem, el: val, balance: editingItem.cl + val });
                                                }}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Balance</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                value={editingItem.balance}
                                                readOnly
                                                className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-black text-blue-700 outline-none cursor-not-allowed shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LOP Days</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                value={editingItem.lop}
                                                onChange={(e) => setEditingItem({ ...editingItem, lop: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg text-sm font-black text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                                    <button
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1 py-2.5 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 rounded-lg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdate}
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <FaSync className="animate-spin" /> : <FaSave />}
                                        {submitting ? 'Saving...' : 'Save Changes'}
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
        </div>
    );
};

