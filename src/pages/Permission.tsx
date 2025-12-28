import React, { useEffect, useState } from 'react';
import { FaUserCircle, FaCheckCircle, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { SharePointService } from '../services/sharePointService';

// Define Permission Interface
import type { PermissionRequest } from '../types/attendance';
import { useCallback } from 'react';

export const Permission: React.FC = () => {
    const navigate = useNavigate();
    const { employee } = useUser();

    // State
    const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPermission, setSelectedPermission] = useState<PermissionRequest | null>(null);
    const [filter, setFilter] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    const fetchPermissions = useCallback(async (showLoading = true) => {
        if (!employee?.email) return;
        try {
            if (showLoading) setLoading(true);
            const data = await SharePointService.getPermissionRequests(employee.email);
            setPermissions(data);
            if (data.length > 0 && !selectedPermission) {
                setSelectedPermission(data[0]);
            }
        } catch (error) {
            console.error("Failed to load permissions", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [employee?.email, selectedPermission]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPermissions(false);
    };

    useEffect(() => {
        console.log("Permission Component Mounted");
        fetchPermissions();
    }, [fetchPermissions]);

    // Filtering Logic
    const filteredPermissions = permissions.filter(p => {
        if (filter === 'All') return true;
        if (filter === 'Pending') {
            return p.status === 'Pending' || p.status === 'Pending Manager Approval';
        }
        return p.status === filter;
    });

    // Helper: Date Formatter
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB');
    };

    // Helper: Central Icon Logic
    const getCentralIcon = (status: string) => {
        if (status === 'Approved') return <FaCheckCircle className="text-green-600 text-3xl mx-auto" />;
        if (status === 'Withdrawn') return <div className="text-blue-600 text-4xl mx-auto">👍</div>;
        if (status.includes('Pending')) return <div className="text-orange-400 text-4xl mx-auto font-serif">?</div>;
        return null;
    };

    return (
        <div className="min-h-full flex flex-col relative -mt-1">
            {/* New Request Button */}
            <div className="absolute top-0 right-0 z-20">
                <button
                    onClick={() => navigate('/permission/new')}
                    className="flex items-center gap-2 bg-[#0078d4] hover:bg-[#005a9e] text-white px-5 py-2 rounded-lg shadow-md transition-all font-semibold text-sm"
                >
                    <FaUserCircle className="text-lg" />
                    <span>New Request</span>
                </button>
            </div>

            <div className="w-full flex-grow flex flex-col min-h-0">
                <header className="flex-none flex items-center justify-start mb-6">
                    {/* Filters */}
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

                    {/* Refresh Button */}
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
                    {/* Left Column: Grid of Cards */}
                    <div className="lg:col-span-9 overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-10 text-gray-500 font-medium">Loading requests...</div>
                        ) : filteredPermissions.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white/40 rounded-xl border border-dashed border-gray-200">No permission requests found.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-8">
                                {filteredPermissions.map(permission => (
                                    <div
                                        key={permission.id}
                                        onClick={() => setSelectedPermission(permission)}
                                        className={`bg-white cursor-pointer transition-all duration-200 border relative group flex flex-col hover:shadow-lg @container ${selectedPermission?.id === permission.id ? 'border-sky-500 ring-2 ring-sky-500/10 scale-[1.02]' : 'border-gray-200 shadow-sm'
                                            }`}
                                    >
                                        <div className="p-4 flex-grow flex flex-col items-center justify-between min-h-[200px] w-full">
                                            <h3 className="font-normal text-gray-900 text-xs @[150px]:text-sm mb-1 text-center truncate w-full px-1">{permission.employeeName}</h3>

                                            <div className="text-gray-700 font-normal text-[11px] @[150px]:text-xs flex items-center justify-center gap-1.5 mb-2 w-full px-1">
                                                <span className="text-sm @[150px]:text-base">🕐</span>
                                                <span className="truncate">{permission.hours} hrs</span>
                                            </div>

                                            <div className="font-normal text-gray-500 text-[8px] @[140px]:text-[9px] @[170px]:text-[10px] mb-3 bg-gray-50 px-1 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap shadow-sm w-full text-center overflow-hidden">
                                                {formatDate(permission.date)}
                                            </div>

                                            {/* Central Status Icon */}
                                            <div className="my-2 transition-transform duration-300 group-hover:scale-110">
                                                {getCentralIcon(permission.status)}
                                            </div>

                                            {/* Divider */}
                                            <div className="w-[40%] h-[1px] bg-gray-100 mt-auto mb-1"></div>
                                        </div>

                                        {/* Status Footer */}
                                        <div className={`w-full h-10 flex items-center justify-center px-2 text-center text-white font-semibold text-[10px] @[150px]:text-xs uppercase tracking-widest ${permission.status === 'Approved' ? 'bg-[#00a651]' :
                                            permission.status === 'Declined' ? 'bg-[#ed1c24]' :
                                                permission.status === 'Withdrawn' ? 'bg-[#4b58e4]' :
                                                    'bg-[#ff9c00]'
                                            }`}>
                                            {permission.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Details Panel */}
                    <div className="lg:col-span-3 flex flex-col min-h-0">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col max-h-full overflow-hidden">
                            {selectedPermission ? (
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
                                            {/* Employee */}
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Employee Name</div>
                                                <div className="text-gray-900 font-bold text-base">{selectedPermission.employeeName}</div>
                                            </div>

                                            {/* Date */}
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Date</div>
                                                <div className="text-xs font-bold text-gray-800 py-1.5 bg-gray-50 rounded border border-gray-100">{formatDate(selectedPermission.date)}</div>
                                            </div>

                                            {/* Hours */}
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hours</div>
                                                <div className="text-xs font-bold text-gray-800 py-1.5 bg-blue-50 rounded border border-blue-100">{selectedPermission.hours} hrs</div>
                                            </div>

                                            {/* Reason */}
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reason (Detail)</div>
                                                <div className="text-xs text-gray-600 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-50 italic">
                                                    {selectedPermission.reason || "No details provided."}
                                                </div>
                                            </div>

                                            <div className="h-px bg-gray-100 w-full"></div>

                                            {/* Status Info */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                                    <div className={`text-xs font-black uppercase ${selectedPermission.status === 'Approved' ? 'text-emerald-600' : selectedPermission.status === 'Pending' ? 'text-amber-500' : 'text-gray-500'}`}>
                                                        {selectedPermission.status}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Approver</div>
                                                    <div className="text-xs font-bold text-gray-800">{selectedPermission.manager}</div>
                                                </div>
                                            </div>

                                            {/* Comments */}
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Manager Comments</div>
                                                <div className="text-[11px] text-gray-600 bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3 italic min-h-[50px] flex items-center justify-center">
                                                    {selectedPermission.approvalComments ? `"${selectedPermission.approvalComments}"` : "No comments from manager."}
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
