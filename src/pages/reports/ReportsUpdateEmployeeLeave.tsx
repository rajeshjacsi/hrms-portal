import { useState, useEffect } from 'react';
import { SharePointService } from '../../services/sharePointService';
import { FaSync, FaSave } from 'react-icons/fa';
import type { Employee } from '../../types/attendance';
import { useUser } from '../../context/UserContext';
import { NotificationModal } from '../../components/NotificationModal';

export const ReportsUpdateEmployeeLeave = () => {
    const { permissionLevel } = useUser();
    const isAdmin = permissionLevel === 'Admin';

    // Manual Attendance Form State
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [formName, setFormName] = useState('');
    const [formEmployeeId, setFormEmployeeId] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formPlace, setFormPlace] = useState('');
    const [formShiftId, setFormShiftId] = useState('');
    const [formStatus, setFormStatus] = useState('Absent');
    const [formCheckIn, setFormCheckIn] = useState('00:00');
    const [formCheckOut, setFormCheckOut] = useState('00:00');
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Notification State
    const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ isOpen: true, type, title, message });
    };

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await SharePointService.getAllEmployees();
                // Sort employees alphabetically by name
                setEmployees(data.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to fetch employees for dropdown", error);
            }
        };
        fetchEmployees();
    }, []);

    const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedName = e.target.value;
        setFormName(selectedName);

        const employee = employees.find(emp => emp.name === selectedName);
        if (employee) {
            setFormEmployeeId(employee.id);
            setFormEmail(employee.email || employee.professionalEmail || '');
            setFormPlace(employee.place || employee.location || '');
            setFormShiftId(employee.shiftId || '');
        } else {
            // Reset if no employee selected (or "Select Employee" option)
            setFormEmployeeId('');
            setFormEmail('');
            setFormPlace('');
            setFormShiftId('');
        }
    };


    const handleSubmitAttendance = async () => {
        if (!formName || !formEmail || !formDate || !formPlace) {
            showNotification("Validation Error", "Please fill in all required fields.", "error");
            return;
        }

        setIsSubmittingForm(true);
        try {
            await SharePointService.createAttendanceRecord({
                name: formName,
                employeeId: formEmployeeId,
                email: formEmail,
                date: formDate,
                place: formPlace,
                shiftId: formShiftId,
                status: formStatus,
                checkInTime: formCheckIn,
                checkOutTime: formCheckOut
            });
            setSuccessMessage(`Attendance record created for ${formName} successfully!`);
            // Reset form
            setFormName('');
            setFormEmployeeId('');
            setFormEmail('');
            setFormPlace('');
            setFormShiftId('');
            setFormStatus('Absent');
            setFormCheckIn('00:00');
            setFormCheckOut('00:00');
            setFormDate(new Date().toISOString().split('T')[0]);
            setTimeout(() => setSuccessMessage(''), 3000);
            showNotification("Success", `Attendance record created for ${formName} successfully!`, "success");
        } catch (error) {
            showNotification("Creation Failed", "Failed to create attendance record. Please try again.", "error");
            console.error(error);
        } finally {
            setIsSubmittingForm(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Update Employees Leave</h1>

            {successMessage && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm animate-slideIn">
                    <p className="text-emerald-700 text-sm flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                        {successMessage}
                    </p>
                </div>
            )}

            {/* Manual Attendance Entry Form */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            <span className="text-red-500">*</span> Staff Name
                        </label>
                        <select
                            value={formName}
                            onChange={handleEmployeeChange}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            <span className="text-red-500">*</span> Staff Mail
                        </label>
                        <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                            placeholder="Enter email address"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            <span className="text-red-500">*</span> Date
                        </label>
                        <input
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            Employee ID
                        </label>
                        <input
                            type="text"
                            value={formEmployeeId}
                            onChange={(e) => setFormEmployeeId(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                            placeholder="Employee ID"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            Place
                        </label>
                        <input
                            type="text"
                            value={formPlace}
                            onChange={(e) => setFormPlace(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                            placeholder="Enter location"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            Shift ID
                        </label>
                        <input
                            type="text"
                            value={formShiftId}
                            onChange={(e) => setFormShiftId(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                            placeholder="Enter Shift ID"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            Status
                        </label>
                        <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="Absent">Absent</option>
                            <option value="Leave">Leave</option>
                            {isAdmin && <option value="Present">Present</option>}
                            {isAdmin && <option value="Holiday">Holiday</option>}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            Check-In Time
                        </label>
                        <input
                            type="time"
                            value={formCheckIn}
                            onChange={(e) => setFormCheckIn(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                            Check-Out Time
                        </label>
                        <input
                            type="time"
                            value={formCheckOut}
                            onChange={(e) => setFormCheckOut(e.target.value)}
                            disabled={!isAdmin}
                            className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmitAttendance}
                        disabled={isSubmittingForm}
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmittingForm ? <FaSync className="animate-spin" /> : <FaSave />}
                        {isSubmittingForm ? 'Submitting...' : 'Submit Attendance'}
                    </button>
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
