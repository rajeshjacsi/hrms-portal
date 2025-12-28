import React, { useEffect, useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { SharePointService } from '../services/sharePointService';
import type { Employee, Asset, LeaveBalance } from '../types/attendance';
import { AssetDetailsModal } from '../components/AssetDetailsModal';

export const EmployeeProfile: React.FC = () => {
    const { accounts } = useMsal();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployeeProfile = async () => {
            try {
                if (accounts.length === 0) return;

                const email = accounts[0].username;
                console.log("Fetching complete employee profile for:", email);

                // Fetch complete profile from EmployeeDB
                const profile = await SharePointService.getEmployeeProfileByEmail(email);
                setEmployee(profile);

                // Fetch assets if employee email is available
                if (profile?.professionalEmail || profile?.email) {
                    const email = profile.professionalEmail || profile.email;
                    const employeeAssets = await SharePointService.getEmployeeAssets(email);
                    setAssets(employeeAssets);
                }

                // Fetch leave balance
                if (profile?.name) {
                    const balance = await SharePointService.getEmployeeLeaveBalance(profile.name);
                    setLeaveBalance(balance);
                }
            } catch (error) {
                console.error("Failed to fetch employee profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeProfile();
    }, [accounts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading profile...</div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-gray-500 mb-2">Employee profile not found</p>
                    <p className="text-sm text-gray-400">Please contact HR if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAsset(null);
    };

    return (
        <div className="p-4 max-w-full mx-auto overflow-x-hidden">
            {/* Page Title */}
            <div className="mb-4 flex items-center gap-2">
                <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">My Profile</h2>
            </div>

            {/* Information Grid - Responsive 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* Personal Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">👤</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-800">Personal Info</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-blue-500 transition-colors">Full Name</label>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{employee.name}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-blue-500 transition-colors">Employee ID</label>
                            <p className="text-sm font-medium text-gray-700 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{employee.employeeId || 'N/A'}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-blue-500 transition-colors">Date of Birth</label>
                            <p className="text-sm font-medium text-gray-700">{formatDate(employee.dateOfBirth)}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-blue-500 transition-colors">Date of Joining</label>
                            <p className="text-sm font-medium text-gray-700">{formatDate(employee.dateOfJoining)}</p>
                        </div>
                    </div>
                </div>

                {/* Work Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">💼</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-800">Work Info</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-purple-500 transition-colors">Department</label>
                            <p className="text-sm font-semibold text-gray-900">{employee.department || 'N/A'}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-purple-500 transition-colors">Designation</label>
                            <p className="text-sm font-medium text-gray-700">{employee.designation || employee.role || 'N/A'}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-purple-500 transition-colors">Reporting Manager</label>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                    {(employee.reportingManager || '?').charAt(0)}
                                </div>
                                <p className="text-sm font-medium text-gray-700">{employee.reportingManager || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-purple-500 transition-colors">Location</label>
                            <p className="text-sm font-medium text-gray-700">{employee.location || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">📞</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-800">Contact Info</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-green-500 transition-colors">Professional Email</label>
                            <p className="text-sm font-medium text-indigo-600 break-all hover:underline cursor-pointer">{employee.professionalEmail || employee.email || 'N/A'}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-green-500 transition-colors">Personal Email</label>
                            <p className="text-sm font-medium text-gray-700 break-all">{employee.personalEmail || 'N/A'}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-green-500 transition-colors">Mobile</label>
                            <p className="text-sm font-medium text-gray-700 font-mono">{employee.contactNumber || 'N/A'}</p>
                        </div>
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-green-500 transition-colors">Emergency</label>
                            <p className="text-sm font-medium text-red-500">{employee.emergencyContact || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">🏠</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-800">Address Info</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-orange-500 transition-colors">Current Address</label>
                            <p className="text-sm font-medium text-gray-700 leading-relaxed">
                                {employee.currentAddress || 'N/A'}
                            </p>
                        </div>
                        <div className="pt-2 border-t border-gray-50 group/item">
                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 block group-hover/item:text-orange-500 transition-colors">Permanent Address</label>
                            <p className="text-sm font-medium text-gray-500 leading-relaxed italic">
                                {employee.permanentAddress || 'Same as current'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Asset Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">💻</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-800">Asset Details</h4>
                    </div>

                    <div className="space-y-3">
                        {assets.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No assets assigned</p>
                        ) : (
                            assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    onClick={() => handleAssetClick(asset)}
                                    className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100 hover:border-cyan-300 hover:shadow-lg transition-all duration-300 group/asset cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-gray-900">{asset.assetType}</span>
                                                {asset.status && (
                                                    <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${asset.status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' :
                                                        asset.status.toLowerCase() === 'inactive' ? 'bg-gray-100 text-gray-600' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {asset.status}
                                                    </span>
                                                )}
                                            </div>
                                            {asset.manufacturer && asset.model && (
                                                <p className="text-xs text-gray-600 font-medium">
                                                    {asset.manufacturer} {asset.model}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                                        {asset.serialNumber && (
                                            <div>
                                                <label className="text-[8px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">Serial Number</label>
                                                <p className="text-xs font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-100">{asset.serialNumber}</p>
                                            </div>
                                        )}
                                        {asset.purchaseDate && (
                                            <div>
                                                <label className="text-[8px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">Purchase Date</label>
                                                <p className="text-xs text-gray-600">{formatDate(asset.purchaseDate)}</p>
                                            </div>
                                        )}
                                        {asset.assignedDate && (
                                            <div className="col-span-2">
                                                <label className="text-[8px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">Assigned Date</label>
                                                <p className="text-xs text-gray-600">{formatDate(asset.assignedDate)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Leave Balance Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">📊</span>
                        </div>
                        <h4 className="text-base font-bold text-gray-800">Leave Balance</h4>
                    </div>

                    <div className="space-y-3">
                        {!leaveBalance ? (
                            <p className="text-sm text-gray-400 italic">No leave balance data found</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                        <label className="text-[8px] uppercase tracking-wider text-emerald-600 font-black block mb-0.5">Casual Leave (CL)</label>
                                        <p className="text-base font-black text-emerald-700">{leaveBalance.cl}</p>
                                    </div>
                                    <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                                        <label className="text-[8px] uppercase tracking-wider text-blue-600 font-black block mb-0.5">Earned Leave (EL)</label>
                                        <p className="text-base font-black text-blue-700">{leaveBalance.el}</p>
                                    </div>
                                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg col-span-2 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] uppercase tracking-wider text-indigo-600 font-black">Total Available Balance</label>
                                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full">Active</span>
                                        </div>
                                        <p className="text-xl font-black text-indigo-700 mt-0.5">{leaveBalance.balance}</p>
                                    </div>
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg col-span-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] uppercase tracking-wider text-gray-400 font-black">Loss of Pay (LOP)</label>
                                            <p className="text-sm font-black text-gray-700">{leaveBalance.lop} Days</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Asset Details Modal */}
            <AssetDetailsModal
                asset={selectedAsset}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};
