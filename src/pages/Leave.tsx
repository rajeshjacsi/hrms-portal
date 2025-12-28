import React, { useEffect, useState, useCallback } from 'react';
import { FaUserCircle, FaCheckCircle, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { SharePointService } from '../services/sharePointService';
import type { LeaveRequest } from '../types/attendance';

export const Leave: React.FC = () => {
    const navigate = useNavigate();
    const { employee } = useUser();

    // State
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [filter, setFilter] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeaves = useCallback(async (showLoading = true) => {
        if (!employee?.email) return;
        try {
            if (showLoading) setLoading(true);
            const data = await SharePointService.getLeaveRequests(employee.email);
            setLeaves(data);
            if (data.length > 0 && !selectedLeave) {
                setSelectedLeave(data[0]);
            }
        } catch (error) {
            console.error("Failed to load leaves", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [employee?.email, selectedLeave]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLeaves(false);
    };

    useEffect(() => {
        console.log("Leave Component Mounted");
        fetchLeaves();
    }, [fetchLeaves]);

    // Filtering Logic
    const filteredLeaves = leaves.filter(l => {
        if (filter === 'All') return true;
        if (filter === 'Pending') {
            return l.status === 'Pending' || l.status === 'Pending Manager Approval';
        }
        return l.status === filter;
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB');
    };

    const getCentralIcon = (status: string) => {
        if (status === 'Approved') return <FaCheckCircle className="text-green-600 text-3xl mx-auto" />;
        if (status === 'Withdrawn') return <div className="text-blue-600 text-4xl mx-auto">👍</div>;
        if (status.includes('Pending')) return <div className="text-orange-400 text-4xl mx-auto font-serif">?</div>;
        return null;
    };

    return (
        <div className="min-h-full flex flex-col relative -mt-1">
            <div className="absolute top-0 right-0 z-20">
                <button
                    onClick={() => navigate('/leave/new')}
                    className="flex items-center gap-2 bg-[#0078d4] hover:bg-[#005a9e] text-white px-5 py-2 rounded-lg shadow-md transition-all font-semibold text-sm"
                >
                    <FaUserCircle className="text-lg" />
                    <span>New Request</span>
                </button>
            </div>

            <div className="w-full flex-grow flex flex-col min-h-0">
                <header className="flex-none flex items-center justify-start mb-6">
                    <div className="flex gap-2 bg-white/60 p-1 rounded-full backdrop-blur-sm shadow-sm border border-gray-100">
                        {['All', 'Pending', 'Approved', 'Declined', 'Withdrawn'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-1.5 rounded-full font-bold text-xs transition-all duration-200 ${filter === f
                                    ? 'bg-[#0078d4] text-white shadow-md'
                                    : 'text-gray-500 hover:bg-white hover:text-[#0078d4]'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className={`ml-3 p-2 rounded-full hover:bg-white/60 text-gray-400 hover:text-[#0078d4] transition-all border border-transparent hover:border-gray-100 shadow-none hover:shadow-sm ${refreshing ? 'animate-spin' : ''}`}
                        title="Refresh List"
                    >
                        <FaSync className="text-sm" />
                    </button>
                </header>

                <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                    <div className="lg:col-span-9 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-10 text-gray-500 font-medium">Loading requests...</div>
                        ) : filteredLeaves.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white/40 rounded-xl border border-dashed border-gray-200">No leave requests found.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-8">
                                {filteredLeaves.map(leave => (
                                    <div
                                        key={leave.id}
                                        onClick={() => setSelectedLeave(leave)}
                                        className={`bg-white cursor-pointer transition-all duration-200 border relative group flex flex-col hover:shadow-lg @container ${selectedLeave?.id === leave.id ? 'border-sky-500 ring-2 ring-sky-500/10 scale-[1.02]' : 'border-gray-200 shadow-sm'
                                            }`}
                                    >
                                        <div className="p-4 flex-grow flex flex-col items-center justify-between min-h-[200px] w-full">
                                            <h3 className="font-normal text-gray-900 text-xs @[150px]:text-sm mb-1 text-center truncate w-full px-1">{leave.employeeName}</h3>

                                            <div className="text-gray-700 font-normal text-[11px] @[150px]:text-xs flex items-center justify-center gap-1.5 mb-2 w-full px-1">
                                                <span className="text-sm @[150px]:text-base">{leave.leaveType.includes('Sick') ? '🤒' : '📅'}</span>
                                                <span className="truncate">{leave.leaveType.replace(/🤒|📅/g, '').trim()}</span>
                                            </div>

                                            <div className="font-normal text-gray-500 text-[8px] @[140px]:text-[9px] @[170px]:text-[10px] mb-3 bg-gray-50 px-1 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap shadow-sm w-full text-center overflow-hidden">
                                                {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                                            </div>

                                            <div className="my-2 transition-transform duration-300 group-hover:scale-110">
                                                {getCentralIcon(leave.status)}
                                            </div>

                                            <div className="w-[40%] h-[1px] bg-gray-100 mt-auto mb-1"></div>
                                        </div>

                                        <div className={`w-full h-10 flex items-center justify-center px-2 text-center text-white font-semibold text-[10px] @[150px]:text-xs uppercase tracking-widest ${leave.status === 'Approved' ? 'bg-[#00a651]' :
                                            leave.status === 'Declined' ? 'bg-[#ed1c24]' :
                                                leave.status === 'Withdrawn' ? 'bg-[#4b58e4]' :
                                                    'bg-[#ff9c00]'
                                            }`}>
                                            {leave.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-3 flex flex-col min-h-0">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col max-h-full overflow-hidden">
                            {selectedLeave ? (
                                <>
                                    <div className="p-5 border-b border-gray-50 flex-none bg-gray-50/50">
                                        <h2 className="text-sm font-bold text-gray-800 text-center uppercase tracking-widest flex items-center justify-center gap-3">
                                            <div className="h-[2px] w-4 bg-gray-200 rounded"></div>
                                            Request Details
                                            <div className="h-[2px] w-4 bg-gray-200 rounded"></div>
                                        </h2>
                                    </div>

                                    <div className="p-5 overflow-y-auto custom-scrollbar flex-grow">
                                        <div className="space-y-6 text-center">
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Employee Name</div>
                                                <div className="text-gray-900 font-bold text-base">{selectedLeave.employeeName}</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">From</div>
                                                    <div className="text-xs font-bold text-gray-800 py-1.5 bg-gray-50 rounded border border-gray-100">{formatDate(selectedLeave.fromDate)}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">To</div>
                                                    <div className="text-xs font-bold text-gray-800 py-1.5 bg-gray-50 rounded border border-gray-100">{formatDate(selectedLeave.toDate)}</div>
                                                </div>
                                            </div>

                                            <div className="inline-flex flex-col items-center">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Leave Type</div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-bold text-xs">
                                                    <span>{selectedLeave.leaveType.includes('Sick') ? '🤒' : '📅'}</span>
                                                    <span>{selectedLeave.leaveType.replace(/🤒|📅/g, '').trim()}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reason (Detail)</div>
                                                <div className="text-xs text-gray-600 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-50 italic">
                                                    {selectedLeave.reason || "No details provided."}
                                                </div>
                                            </div>

                                            <div className="h-px bg-gray-100 w-full"></div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                                    <div className={`text-xs font-black uppercase ${selectedLeave.status === 'Approved' ? 'text-emerald-600' : selectedLeave.status === 'Pending' ? 'text-amber-500' : 'text-gray-500'}`}>
                                                        {selectedLeave.status}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Approver</div>
                                                    <div className="text-xs font-bold text-gray-800">{selectedLeave.manager}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Manager Comments</div>
                                                <div className="text-[11px] text-gray-600 bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3 italic min-h-[50px] flex items-center justify-center">
                                                    {selectedLeave.approvalComments ? `"${selectedLeave.approvalComments}"` : "No comments from manager."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-10 flex flex-col items-center justify-center text-gray-300 space-y-3 opacity-60">
                                    <div className="text-5xl">📌</div>
                                    <p className="text-xs font-bold uppercase tracking-widest">Select a card</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
