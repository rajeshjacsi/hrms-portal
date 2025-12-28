import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { SharePointService } from '../services/sharePointService';
import {
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaCalendarCheck,
    FaUserCheck,
    FaSearch,
    FaCheck,
    FaTimes
} from 'react-icons/fa';
import toast from 'react-hot-toast';

type ApprovalType = 'Regularization' | 'Leave' | 'Permission';

interface ApproverListItem {
    Id: number;
    id?: string;
    Title?: string;
    EmployeeName?: string;
    employeeName?: string;
    MailID?: string;
    email?: string;
    Status?: string;
    status?: string;
    manager?: unknown; // Flexible for string or expanded object
    Detail?: string;
    Reason?: string;
    reason?: string;
    LeaveType?: string;
    leaveType?: string;
    permissionType?: string;
    date?: string;
    Date?: string;
    From?: string;
    fromDate?: string;
    To?: string;
    toDate?: string;
    submittedOn?: string;
    DateCreated?: string;
    LeaveDuration?: string;
    leaveDuration?: string;
    hours?: string;
    AdminComments?: string;
    ApprovalComments?: string;
}

export const Approvals: React.FC = () => {
    const { employee, permissionLevel } = useUser();
    const [activeTab, setActiveTab] = useState<ApprovalType>('Regularization');
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<ApproverListItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ApproverListItem | null>(null);
    const [processStatus, setProcessStatus] = useState<'Approved' | 'Rejected'>('Approved');
    const [comments, setComments] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);



    const formatDate = (dateValue: string | number | undefined) => {
        if (!dateValue || dateValue === 'N/A') return '-';
        const str = String(dateValue);
        try {
            // Handle ISO strings (e.g., 2025-12-27T05:00:00Z)
            if (str.includes('T')) {
                const date = new Date(str);
                if (!isNaN(date.getTime())) {
                    const d = date.getDate().toString().padStart(2, '0');
                    const m = (date.getMonth() + 1).toString().padStart(2, '0');
                    const y = date.getFullYear();
                    return `${d}/${m}/${y}`;
                }
            }
            // Handle YYYY-MM-DD
            if (str.includes('-')) {
                const parts = str.split('T')[0].split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
            return str;
        } catch {
            return str;
        }
    };

    const managerEmail = employee?.email || '';

    const fetchRequests = React.useCallback(async () => {
        setLoading(true);
        try {
            let data: ApproverListItem[] = [];
            if (activeTab === 'Regularization') {
                data = (await SharePointService.getPendingRegularizations(managerEmail, permissionLevel === 'Admin')) as any;
            } else if (activeTab === 'Leave') {
                const allLeaves = await SharePointService.getAllLeaveRequests();
                data = allLeaves.filter((r: any) =>
                    // MUST be Pending AND have matching manager email (Strict for everyone)
                    (r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase().includes('pending')) &&
                    (managerEmail && r.manager?.toLowerCase() === managerEmail.toLowerCase())
                ) as any;
            } else {
                const allPermissions = await SharePointService.getAllPermissionRequests();
                data = allPermissions.filter((r: any) =>
                    (r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase().includes('pending')) &&
                    (managerEmail && r.manager?.toLowerCase() === managerEmail.toLowerCase())
                ) as any;
            }
            setRequests(data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load pending requests');
        } finally {
            setLoading(false);
        }
    }, [activeTab, managerEmail, permissionLevel]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleProcess = (request: ApproverListItem, status: 'Approved' | 'Rejected') => {
        setSelectedRequest(request);
        setProcessStatus(status);
        setComments('');
        setShowProcessModal(true);
    };

    const confirmProcess = async () => {
        if (!selectedRequest) return;
        setIsProcessing(true);
        try {
            await SharePointService.updateApprovalStatus(
                activeTab,
                String(selectedRequest.Id || selectedRequest.id || ''),
                processStatus,
                comments
            );
            toast.success(`${activeTab} request ${processStatus.toLowerCase()} successfully`);
            setShowProcessModal(false);
            fetchRequests();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update request status';
            console.error('Error processing request:', error);
            toast.error(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredRequests = requests.filter((r: ApproverListItem) => {
        const name = (r.EmployeeName || r.employeeName || r.Title || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    const getTabIcon = (tab: ApprovalType) => {
        switch (tab) {
            case 'Regularization': return <FaClock />;
            case 'Leave': return <FaCalendarCheck />;
            case 'Permission': return <FaUserCheck />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Unified Approvals</h1>
                    <p className="text-gray-500 text-sm">Review and manage employee requests across all categories.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by employee name..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-200/50 rounded-xl w-fit">
                {(['Regularization', 'Leave', 'Permission'] as ApprovalType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                    >
                        {getTabIcon(tab)}
                        {tab === 'Regularization' ? 'Missed Check-ins' : tab === 'Permission' ? 'Permissions' : 'Leaves'}
                    </button>
                ))}
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium italic">Scanning for pending {activeTab.toLowerCase()} requested...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FaCheckCircle className="text-4xl text-green-200" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">All Caught Up!</h3>
                        <p className="text-gray-500 max-w-sm mt-2">No pending {activeTab.toLowerCase()} requests found for your review.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Manager</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Detail</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date/Duration</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRequests.map((req: ApproverListItem, idx) => (
                                    <tr key={req.Id || req.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                                                    {(req.EmployeeName || req.employeeName || req.Title || 'E')[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{req.EmployeeName || req.employeeName || req.Title}</div>
                                                    <div className="text-xs text-gray-500">{req.MailID || req.email || 'Employee'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 italic">
                                            {typeof req.manager === 'object' ? String((req.manager as Record<string, unknown>)?.Title || 'N/A') : (String(req.manager || 'N/A'))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded uppercase tracking-wider border border-orange-100">
                                                {req.Status || req.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            <div className="max-w-[150px] truncate" title={req.reason || req.Detail}>
                                                <span className="font-medium">{activeTab === 'Regularization' ? 'Missed Check-in' : (req.leaveType || req.permissionType || '-')}</span>
                                                <p className="text-xs text-gray-400 mt-0.5">{req.reason || req.Detail || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {activeTab === 'Regularization' ? formatDate(req.Date || req.date) : formatDate(req.fromDate || req.From || req.date)}
                                            </div>
                                            <div className="text-[10px] text-gray-400 italic">
                                                {activeTab === 'Leave' ? `${formatDate(req.toDate || req.To)}` : (req.leaveDuration || req.hours || '-')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {activeTab === 'Leave' ? `${formatDate(req.fromDate)} to ${formatDate(req.toDate)}` : formatDate(req.date || req.Date)}
                                            </div>
                                            <div className="text-[10px] text-gray-500 italic">
                                                {activeTab === 'Regularization' ? 'Full Day' : activeTab === 'Permission' ? `${req.hours} hours` : req.leaveDuration}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleProcess(req, 'Approved')}
                                                    className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                                                    title="Approve"
                                                >
                                                    <FaCheck />
                                                </button>
                                                <button
                                                    onClick={() => handleProcess(req, 'Rejected')}
                                                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                    title="Reject"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Process Modal */}
            {showProcessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className={`p-6 text-white ${processStatus === 'Approved' ? 'bg-green-600' : 'bg-red-600'}`}>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {processStatus === 'Approved' ? <FaCheckCircle /> : <FaTimesCircle />}
                                {processStatus} Request
                            </h2>
                            <p className="text-white/80 text-sm mt-1">Reviewing {activeTab.toLowerCase()} for {selectedRequest?.EmployeeName || selectedRequest?.employeeName || selectedRequest?.Title}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Approver Comments</label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder={`Enter reason for ${processStatus.toLowerCase()}...`}
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-32"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowProcessModal(false)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmProcess}
                                disabled={isProcessing}
                                className={`px-6 py-2 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center gap-2 ${processStatus === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                    } disabled:opacity-50`}
                            >
                                {isProcessing ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    processStatus === 'Approved' ? <FaCheck /> : <FaTimes />
                                )}
                                Confirm {processStatus}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
