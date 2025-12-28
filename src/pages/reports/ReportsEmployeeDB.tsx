import { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import type { EmployeeDBRecord } from '../../types/attendance';
import { FaSearch, FaSync, FaPlus, FaEdit, FaSave, FaBuilding, FaTrash, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/ConfirmModal';

export const ReportsEmployeeDB = () => {
    const [records, setRecords] = useState<EmployeeDBRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState<Omit<EmployeeDBRecord, 'id'>>({
        name: '',
        employeeId: '',
        professionalEmail: '',
        department: '',
        designation: '',
        reportingManager: '',
        location: '',
        deskNumber: '',
        contactNumber: '',
        emergencyContact: '',
        dateOfJoining: '',
        dateOfBirth: '',
        personalEmail: '',
        currentAddress: '',
        permanentAddress: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await SharePointService.getAllEmployeesDB();
            const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));
            setRecords(sortedData);
        } catch (error) {
            console.error("Failed to fetch employee DB records", error);
            toast.error('Failed to load employee database');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setIsEditing(false);
        setCurrentRecordId(null);
        setFormData({
            name: '',
            employeeId: '',
            professionalEmail: '',
            department: '',
            designation: '',
            reportingManager: '',
            location: '',
            deskNumber: '',
            contactNumber: '',
            emergencyContact: '',
            dateOfJoining: '',
            dateOfBirth: '',
            personalEmail: '',
            currentAddress: '',
            permanentAddress: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (record: EmployeeDBRecord) => {
        setIsEditing(true);
        setCurrentRecordId(record.id);
        setFormData({
            name: record.name,
            employeeId: record.employeeId,
            professionalEmail: record.professionalEmail,
            department: record.department,
            designation: record.designation,
            reportingManager: record.reportingManager,
            location: record.location,
            deskNumber: record.deskNumber,
            contactNumber: record.contactNumber,
            emergencyContact: record.emergencyContact,
            dateOfJoining: record.dateOfJoining,
            dateOfBirth: record.dateOfBirth,
            personalEmail: record.personalEmail,
            currentAddress: record.currentAddress,
            permanentAddress: record.permanentAddress
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
            await SharePointService.deleteEmployeeDBRecord(recordToDelete);
            toast.success('Employee record deleted successfully');
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
        // Validation
        if (!formData.name?.trim()) {
            toast.error('Employee Name is required');
            return;
        }
        if (!formData.professionalEmail?.trim()) {
            toast.error('Professional Email is required');
            return;
        }

        setSaving(true);
        try {
            if (isEditing && currentRecordId) {
                await SharePointService.updateEmployeeDBRecord(currentRecordId, formData);
                toast.success('Employee record updated successfully');
            } else {
                await SharePointService.addEmployeeDBRecord(formData);
                toast.success('New employee added successfully');
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (error) {
            console.error("Failed to save record", error);
            toast.error('Failed to save record. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const filteredRecords = records.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.professionalEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="flex flex-col h-full p-6 md:p-8">
            <div className="flex-shrink-0 sticky top-0 z-20 bg-gray-50 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaBuilding className="text-blue-600" />
                        Employee Database
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Complete directory of all employees across locations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all shadow-sm font-medium"
                    >
                        <FaPlus />
                        Add Employee
                    </button>
                    <button
                        onClick={fetchRecords}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, email, or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                        />
                    </div>
                    <div className="text-xs text-gray-500 font-medium ml-auto">
                        Showing {filteredRecords.length} records
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[2000px]">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="bg-gray-50 border-b border-gray-200 shadow-sm">
                                <th className="sticky left-0 bg-gray-50 z-20 px-4 py-3 text-[10px] font-bold text-gray-500 uppercase w-24 text-center">Action</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[100px]">Emp ID</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[200px]">Name</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[250px]">Professional Email</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[150px]">Department</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[150px]">Designation</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[150px]">Reporting Mgr</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[120px]">Location</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[100px]">Desk No</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[120px]">Contact No</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[120px]">Emergency No</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[100px]">DOJ</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[100px]">DOB</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[200px]">Personal Email</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[300px]">Current Address</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left min-w-[300px]">Permanent Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded"></div></td>
                                        <td colSpan={15} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-1/2"></div></td>
                                    </tr>
                                ))
                            ) : filteredRecords.length > 0 ? (
                                filteredRecords.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group text-sm text-gray-700">
                                        <td className="sticky left-0 bg-white group-hover:bg-blue-50/30 z-20 px-4 py-3 text-center border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-all"
                                                    title="Edit Record"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(item.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-all"
                                                    title="Delete Record"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.employeeId}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.professionalEmail}</td>
                                        <td className="px-4 py-3">{item.department}</td>
                                        <td className="px-4 py-3">{item.designation}</td>
                                        <td className="px-4 py-3">{item.reportingManager}</td>
                                        <td className="px-4 py-3">{item.location}</td>
                                        <td className="px-4 py-3">{item.deskNumber}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.contactNumber}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.emergencyContact}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatDisplayDate(item.dateOfJoining)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatDisplayDate(item.dateOfBirth)}</td>
                                        <td className="px-4 py-3 text-gray-500">{item.personalEmail}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-xs" title={item.currentAddress}>{item.currentAddress}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-xs" title={item.permanentAddress}>{item.permanentAddress}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={16} className="px-6 py-12 text-center text-gray-400 font-medium italic bg-gray-50/50">
                                        No employees found matching your search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {isEditing ? <FaEdit className="text-blue-600" /> : <FaPlus className="text-blue-600" />}
                                {isEditing ? 'Edit Employee Record' : 'Add New Employee'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Professional Details</h3>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Employee Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Full Name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Employee ID</label>
                                        <input
                                            type="text"
                                            value={formData.employeeId}
                                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="e.g. JMT 123"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Professional Email <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            value={formData.professionalEmail}
                                            onChange={(e) => setFormData({ ...formData, professionalEmail: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="work@jm-group.ca"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Department</label>
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Department Name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Designation</label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Job Title"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Reporting Manager</label>
                                        <input
                                            type="text"
                                            value={formData.reportingManager}
                                            onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Manager Name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Date of Joining</label>
                                        <input
                                            type="date"
                                            value={formData.dateOfJoining ? formData.dateOfJoining.split('T')[0] : ''}
                                            onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Place</label>
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Desk Number</label>
                                            <input
                                                type="text"
                                                value={formData.deskNumber}
                                                onChange={(e) => setFormData({ ...formData, deskNumber: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="Desk ID"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Personal Details</h3>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Personal Email</label>
                                        <input
                                            type="email"
                                            value={formData.personalEmail}
                                            onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="personal@gmail.com"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Contact Number</label>
                                        <input
                                            type="text"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Mobile Number"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Emergency Contact</label>
                                        <input
                                            type="text"
                                            value={formData.emergencyContact}
                                            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Emergency Number"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Current Address</label>
                                        <textarea
                                            value={formData.currentAddress}
                                            onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-20"
                                            placeholder="Full current address"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Permanent Address</label>
                                        <textarea
                                            value={formData.permanentAddress}
                                            onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-20"
                                            placeholder="Full permanent address"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 z-10">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <FaSync className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        Save Employee
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
                title="Delete Employee Record"
                message="Are you sure you want to delete this employee record? This action cannot be undone."
                confirmText="Delete Record"
                cancelText="Cancel"
                isDestructive={true}
            />
        </div>
    );
};