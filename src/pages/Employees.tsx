import React, { useEffect, useState, useCallback } from 'react';
import { useMsal } from "@azure/msal-react";
import { useUser } from '../context/UserContext';
import { FaUserCircle, FaClock, FaTimesCircle, FaPlus, FaTimes, FaEdit, FaCheckCircle, FaExclamationCircle, FaSearch, FaTrash, FaBan } from 'react-icons/fa';
import { SharePointService } from '../services/sharePointService';
import type { Employee, Shift, AttendanceRecord } from '../types/attendance';
import { getAttendanceState } from '../utils/timeUtils';
import { getTimeZoneLabel } from '../utils/timeZones';

export const Employees: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord | null>>({});
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { permissionLevel, employee: currentUser } = useUser();
    const { instance } = useMsal();

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [employeeToDisable, setEmployeeToDisable] = useState<Employee | null>(null);
    const [employeeToEnable, setEmployeeToEnable] = useState<Employee | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Form States
    const [newEmployee, setNewEmployee] = useState({
        name: '', role: '', department: '', email: '', shiftId: '', place: '', padding: '',
        permissionLevel: 'Employee' as 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts'
    });

    const [editFormData, setEditFormData] = useState({
        name: '', role: '', department: '', email: '', shiftId: '', place: '',
        permissionLevel: 'Employee' as 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts'
    });

    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addLog = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)}: ${msg}`]);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            addLog("Starting fetch...");
            const emps = await SharePointService.getAllEmployees();
            setEmployees(permissionLevel === 'HR' ? emps.filter(e => e.permissionLevel !== 'Admin') : emps);

            const allShifts = await SharePointService.getAllShifts();
            setShifts(allShifts);

            if (emps.length > 0) {
                const statusCalls = emps.map(e => SharePointService.getTodayAttendance(e.id).catch(() => null));
                const statuses = await Promise.all(statusCalls);
                const newMap: Record<string, AttendanceRecord | null> = {};
                emps.forEach((e, i) => { newMap[e.id] = statuses[i]; });
                setAttendanceMap(newMap);
            }
            addLog("Fetch complete.");
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [permissionLevel]);

    useEffect(() => {
        fetchData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, [fetchData]);


    const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const added = await SharePointService.addEmployee({ ...newEmployee, avatarUrl: '' });
            setEmployees(prev => [...prev, added]);
            setShowAddModal(false);
            showNotification("Employee added successfully!");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            showNotification(`Failed to add: ${errorMsg}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        try {
            setLoading(true);
            await SharePointService.updateEmployee(editingId, editFormData);
            setEmployees(prev => prev.map(emp => emp.id === editingId ? { ...emp, ...editFormData } : emp));
            setEditingId(null);
            showNotification("Employee updated successfully!");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            showNotification(`Update failed: ${errorMsg}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;
        try {
            setLoading(true);
            await SharePointService.deleteEmployee(employeeToDelete.id);
            setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
            setEmployeeToDelete(null);
            showNotification("Employee removed successfully");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            showNotification(`Delete failed: ${errorMsg}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDisable = async () => {
        if (!employeeToDisable) return;
        try {
            setLoading(true);
            await SharePointService.disableEmployee(employeeToDisable.id);
            setEmployees(prev => prev.map(e => e.id === employeeToDisable.id ? { ...e, accountStatus: 'Disabled' } : e));
            setEmployeeToDisable(null);
            showNotification("Employee disabled successfully");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            showNotification(`Disable failed: ${errorMsg}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEnable = async () => {
        if (!employeeToEnable) return;
        try {
            setLoading(true);
            await SharePointService.enableEmployee(employeeToEnable.id);
            setEmployees(prev => prev.map(e => e.id === employeeToEnable.id ? { ...e, accountStatus: 'Active' } : e));
            setEmployeeToEnable(null);
            showNotification("Employee enabled successfully");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            showNotification(`Enable failed: ${errorMsg}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (emp: Employee) => {
        // HR Restriction Logic: Cannot edit Access for Self or other HRs
        if (permissionLevel === 'HR') {
            if (emp.email === currentUser?.email) {
                showNotification("Contact Admin to make changes to your own profile.", "error");
                return;
            }
            if (emp.department === 'HR') {
                showNotification("Contact Admin to make changes to HR profiles.", "error");
                return;
            }
        }

        setEditingId(emp.id);
        setEditFormData({
            name: emp.name, role: emp.role || '', department: emp.department || '',
            email: emp.email || '', shiftId: emp.shiftId || '', place: emp.place || '',
            permissionLevel: (emp.permissionLevel || 'Employee') as 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts'
        });
    };

    const getShiftById = (id: string) => shifts.find(s => s.id === id);

    if (error) {
        const isAuthError = error.includes("InteractionRequired") || error.includes("No active account");
        return (
            <div className="p-12 text-center">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl inline-block max-w-2xl text-left border border-red-100 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Error Loading Directory</h3>
                    <p className="font-mono text-sm mb-4">{error}</p>
                    <div className="border-t border-red-200 pt-3">
                        <p className="font-bold text-xs uppercase mb-1">Debug History:</p>
                        {debugLog.map((l, i) => <div key={i} className="text-xs opacity-75">{l}</div>)}
                    </div>
                </div>
                <div className="mt-8 flex gap-4 justify-center">
                    {isAuthError ? (
                        <button onClick={() => instance.acquireTokenPopup({ scopes: ["https://jmtechtalent.sharepoint.com/.default"] }).then(fetchData)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-100">Reconnect</button>
                    ) : (
                        <button onClick={fetchData} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Retry</button>
                    )}
                </div>
            </div>
        );
    }

    if (loading && employees.length === 0) {
        return (
            <div className="p-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono w-full max-w-md text-left shadow-xl h-48 overflow-y-auto">
                    <p className="text-white border-b border-gray-800 pb-1 mb-2">System Initializing...</p>
                    {debugLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Employee Directory</h1>
                    <p className="text-gray-500 mt-1">Manage personnel and monitor live attendance status.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Filter by name or role..." className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={fetchData} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all shadow-sm" title="Refresh Data">
                        <FaClock />
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 font-semibold transition-all shrink-0">
                        <FaPlus /> <span className="hidden sm:inline">Add Employee</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {employees
                    .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.role.toLowerCase().includes(searchTerm.toLowerCase()))
                    .sort((a, b) => {
                        // 1. Account Status: Active first, Disabled last
                        if (a.accountStatus !== 'Disabled' && b.accountStatus === 'Disabled') return -1;
                        if (a.accountStatus === 'Disabled' && b.accountStatus !== 'Disabled') return 1;

                        // 2. Name: Ascending
                        return a.name.localeCompare(b.name);
                    })
                    .map(employee => {
                        const shift = getShiftById(employee.shiftId);
                        const attendance = attendanceMap[employee.id];
                        const isCheckedIn = attendance && !attendance.checkOutTime;
                        const { state } = shift ? getAttendanceState(shift, currentTime) : { state: 'OFF' };

                        return (
                            <div key={employee.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    <div className="md:col-span-4 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><FaUserCircle size={28} /></div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-bold truncate ${employee.accountStatus === 'Disabled' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{employee.name}</h3>
                                                <button onClick={() => handleEditClick(employee)} className="text-gray-400 hover:text-indigo-600 p-1"><FaEdit size={14} /></button>
                                                {employee.accountStatus === 'Disabled' ? (
                                                    <button onClick={() => setEmployeeToEnable(employee)} className="text-gray-400 hover:text-green-600 p-1" title="Enable User"><FaCheckCircle size={12} /></button>
                                                ) : (
                                                    <button onClick={() => setEmployeeToDisable(employee)} className="text-gray-400 hover:text-orange-600 p-1" title="Disable User"><FaBan size={12} /></button>
                                                )}
                                                {permissionLevel === 'Admin' && (
                                                    <button onClick={() => setEmployeeToDelete(employee)} className="text-gray-400 hover:text-red-600 p-1"><FaTrash size={12} /></button>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate font-medium">{employee.role} &bull; {employee.department}</p>
                                        </div>
                                    </div>
                                    <div className="md:col-span-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><FaClock /></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shift Schedule</p>
                                            {shift ? (
                                                <div className="flex flex-col">
                                                    <p className="font-bold text-gray-800 text-sm">{shift.name} <span className="font-normal text-gray-500 ml-1">({shift.startTime} - {shift.endTime})</span></p>
                                                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">{getTimeZoneLabel(shift.timeZone || 'UTC')}</span>
                                                </div>
                                            ) : (
                                                <p className="text-gray-400 italic text-sm">Not Assigned</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-200'}`}></div>
                                        <p className={`text-sm font-bold ${isCheckedIn ? 'text-green-700' : 'text-gray-400'}`}>{isCheckedIn ? 'ON DUTY' : 'OFF DUTY'}</p>
                                    </div>
                                    <div className="md:col-span-2 flex justify-end">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-tighter uppercase flex items-center gap-1.5 ${state === 'ACTIVE' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                            {state === 'ACTIVE' ? <><FaCheckCircle size={10} /> Active Now</> : <><FaTimesCircle size={10} /> {state}</>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Modals & Popups */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-gray-900">New Employee Profile</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4">
                            <div><label className="label-style">Full Name</label><input type="text" required className="input-style" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} /></div>
                            <div><label className="label-style">Work Email</label><input type="email" required className="input-style" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="label-style">Role</label><input type="text" required className="input-style" value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })} /></div>
                                <div><label className="label-style">Dept</label><input type="text" required className="input-style" value={newEmployee.department} onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })} /></div>
                            </div>
                            <div><label className="label-style">Work Location</label><input type="text" className="input-style" value={newEmployee.place} onChange={e => setNewEmployee({ ...newEmployee, place: e.target.value })} placeholder="e.g. Chennai, Remote, etc." /></div>
                            <div><label className="label-style">Shift Assignment</label>
                                <select className="input-style bg-white" value={newEmployee.shiftId} onChange={e => setNewEmployee({ ...newEmployee, shiftId: e.target.value })}>
                                    <option value="">Choose a shift...</option>
                                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
                                </select>
                            </div>
                            <div><label className="label-style">Permission Level</label>
                                <select className="input-style bg-white" value={newEmployee.permissionLevel} onChange={e => setNewEmployee({ ...newEmployee, permissionLevel: e.target.value as 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts' })}>
                                    <option value="Employee">Employee</option>
                                    <option value="Manager">Manager</option>
                                    <option value="HR">HR</option>
                                    {permissionLevel === 'Admin' && <option value="Admin">Admin</option>}
                                    <option value="Accounts">Accounts</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Create Profile</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingId && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-gray-900">Update Employee</h3>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-900 transition-colors"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div><label className="label-style">Full Name</label><input type="text" required className="input-style" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="label-style">Role</label><input type="text" required className="input-style" value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })} /></div>
                                <div><label className="label-style">Dept</label><input type="text" required className="input-style" value={editFormData.department} onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} /></div>
                            </div>
                            <div><label className="label-style">Work Location</label><input type="text" className="input-style" value={editFormData.place} onChange={e => setEditFormData({ ...editFormData, place: e.target.value })} placeholder="e.g. Chennai, Remote, etc." /></div>
                            <div><label className="label-style">Shift</label>
                                <select className="input-style bg-white" value={editFormData.shiftId} onChange={e => setEditFormData({ ...editFormData, shiftId: e.target.value })}>
                                    <option value="">Select Shift</option>
                                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>)}
                                </select>
                            </div>
                            <div><label className="label-style">Permission Level</label>
                                <select className="input-style bg-white" value={editFormData.permissionLevel} onChange={e => setEditFormData({ ...editFormData, permissionLevel: e.target.value as 'Employee' | 'Manager' | 'HR' | 'Admin' | 'Accounts' })}>
                                    <option value="Employee">Employee</option>
                                    <option value="Manager">Manager</option>
                                    <option value="HR">HR</option>
                                    {permissionLevel === 'Admin' && <option value="Admin">Admin</option>}
                                    <option value="Accounts">Accounts</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setEditingId(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {employeeToDelete && (
                <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><FaTrash size={24} /></div>
                        <h4 className="text-xl font-bold mb-2">Confirm Removal</h4>
                        <p className="text-gray-500 text-sm mb-8">Are you sure you want to remove <span className="font-bold text-gray-900">{employeeToDelete.name}</span>?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setEmployeeToDelete(null)} className="flex-1 py-2 font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                            <button onClick={handleConfirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-100">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {employeeToDisable && (
                <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><FaBan size={24} /></div>
                        <h4 className="text-xl font-bold mb-2">Disable Account</h4>
                        <p className="text-gray-500 text-sm mb-6">Are you sure you want to disable access for <span className="font-bold text-gray-900">{employeeToDisable.name}</span>?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setEmployeeToDisable(null)} className="flex-1 py-2 font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                            <button onClick={handleConfirmDisable} className="flex-1 py-2 bg-orange-600 text-white rounded-lg font-bold shadow-lg shadow-orange-100 hover:bg-orange-700">Disable</button>
                        </div>
                    </div>
                </div>
            )}

            {employeeToEnable && (
                <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><FaCheckCircle size={24} /></div>
                        <h4 className="text-xl font-bold mb-2">Enable Account</h4>
                        <p className="text-gray-500 text-sm mb-6">Are you sure you want to enable access for <span className="font-bold text-gray-900">{employeeToEnable.name}</span>?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setEmployeeToEnable(null)} className="flex-1 py-2 font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                            <button onClick={handleConfirmEnable} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold shadow-lg shadow-green-100 hover:bg-green-700">Enable</button>
                        </div>
                    </div>
                </div>
            )}


            {notification && (
                <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 transition-all animate-bounce-in ${notification.type === 'success' ? 'bg-white border-green-100 text-green-800' : notification.type === 'error' ? 'bg-white border-red-100 text-red-800' : 'bg-white border-indigo-100 text-indigo-800'}`}>
                    <div className={`text-xl ${notification.type === 'success' ? 'text-green-500' : notification.type === 'error' ? 'text-red-500' : 'text-indigo-500'}`}>
                        {notification.type === 'success' ? <FaCheckCircle /> : notification.type === 'error' ? <FaExclamationCircle /> : <FaCheckCircle />}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{notification.type}</p>
                        <p className="font-bold text-sm tracking-tight">{notification.message}</p>
                    </div>
                </div>
            )}

            <style>{`
                .label-style { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
                .input-style { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
                .input-style:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08); }
            `}</style>
        </div>
    );
};
