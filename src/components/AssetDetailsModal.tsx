import React from 'react';
import { FaLaptop, FaDesktop, FaMobile, FaKeyboard, FaMouse, FaHeadphones, FaCog } from 'react-icons/fa';
import type { Asset } from '../types/attendance';

interface AssetDetailsModalProps {
    asset: Asset | null;
    isOpen: boolean;
    onClose: () => void;
}

export const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({ asset, isOpen, onClose }) => {
    if (!isOpen || !asset) return null;

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getAssetIcon = (type: string) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('laptop')) return <FaLaptop className="text-3xl" />;
        if (lowerType.includes('desktop') || lowerType.includes('pc')) return <FaDesktop className="text-3xl" />;
        if (lowerType.includes('mobile') || lowerType.includes('phone')) return <FaMobile className="text-3xl" />;
        if (lowerType.includes('keyboard')) return <FaKeyboard className="text-3xl" />;
        if (lowerType.includes('mouse')) return <FaMouse className="text-3xl" />;
        if (lowerType.includes('headphone') || lowerType.includes('headset')) return <FaHeadphones className="text-3xl" />;
        return <FaLaptop className="text-3xl" />;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black bg-opacity-65 backdrop-blur-md">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100">
                {/* Header - Very Compact and Clear */}
                <div className="bg-blue-600 text-white p-5 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
                            {getAssetIcon(asset.assetType)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black leading-none tracking-tight">{asset.assetType}</h2>
                            <p className="text-blue-100 text-[11px] uppercase font-black mt-1.5 tracking-widest opacity-90">Asset Category</p>
                        </div>
                    </div>
                </div>

                {/* Content - Non-scrollable focused grid */}
                <div className="p-6 space-y-4">
                    {/* Status & User Row */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-[11px] text-slate-500 font-black uppercase leading-none mb-1">Assigned To</p>
                                <p className="text-base font-black text-slate-900 tracking-tight">{asset.employeeName}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight ${asset.status?.toLowerCase() === 'active' || asset.status?.toLowerCase() === 'working'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                            {asset.status || 'Active'}
                        </span>
                    </div>

                    {/* Compact Specs Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {asset.manufacturer && (
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <label className="text-[11px] uppercase font-black text-gray-400 block pb-1">Brand</label>
                                <p className="text-sm font-bold text-gray-800">{asset.manufacturer}</p>
                            </div>
                        )}
                        {asset.model && (
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <label className="text-[11px] uppercase font-black text-gray-400 block pb-1">Model</label>
                                <p className="text-sm font-bold text-gray-800">{asset.model}</p>
                            </div>
                        )}
                        {asset.purchaseDate && (
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <label className="text-[11px] uppercase font-black text-gray-400 block pb-1">Purchase Date</label>
                                <p className="text-sm font-bold text-gray-800">{formatDate(asset.purchaseDate)}</p>
                            </div>
                        )}
                        {asset.assignedDate && (
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <label className="text-[11px] uppercase font-black text-gray-400 block pb-1">Assigned Date</label>
                                <p className="text-sm font-bold text-gray-800">{formatDate(asset.assignedDate)}</p>
                            </div>
                        )}

                        <div className="col-span-2 space-y-3">
                            {asset.serialNumber && (
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="text-[11px] uppercase font-black text-gray-400 block mb-1.5">Serial Number</label>
                                    <p className="text-sm font-mono font-bold text-emerald-600 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                        {asset.serialNumber}
                                    </p>
                                </div>
                            )}

                            {/* System Hardware Inline */}
                            {(asset.processor || asset.ram || asset.hdd) && (
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FaCog className="text-sm text-blue-600" />
                                        <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">System Specifications</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {asset.processor && (
                                            <div className="space-y-1 border-b border-slate-100 pb-3">
                                                <p className="text-[11px] uppercase text-slate-400 font-black">CPU / Processor</p>
                                                <p className="text-sm font-bold text-slate-800 leading-relaxed">{asset.processor}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-6">
                                            {asset.ram && (
                                                <div className="space-y-1 border-r border-slate-100 pr-4">
                                                    <p className="text-[11px] uppercase text-slate-400 font-black">RAM / Memory</p>
                                                    <p className="text-sm font-bold text-slate-800">{asset.ram}</p>
                                                </div>
                                            )}
                                            {asset.hdd && (
                                                <div className="space-y-1">
                                                    <p className="text-[11px] uppercase text-slate-400 font-black">Disk / Storage</p>
                                                    <p className="text-sm font-bold text-slate-800">{asset.hdd}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Single Action Button Footer */}
                <div className="bg-slate-50 p-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-blue-600 text-white text-xs font-black rounded-lg hover:bg-blue-700 transition-colors shadow-lg uppercase tracking-widest"
                    >
                        Close Detail View
                    </button>
                </div>
            </div>
        </div>
    );
};
