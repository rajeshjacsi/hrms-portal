import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SharePointService } from '../services/sharePointService';
import { FaCalendarAlt, FaUmbrellaBeach, FaHospitalAlt, FaStreetView, FaPhoneVolume } from 'react-icons/fa';
import { NotificationModal } from '../components/NotificationModal';
import { useUser } from '../context/UserContext';

export const LeaveRequest: React.FC = () => {
    const navigate = useNavigate();
    const { employee } = useUser();
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({
        isOpen: false,
        type: 'success' as 'success' | 'error',
        title: '',
        message: ''
    });

    // Unified Form State
    const [form, setForm] = useState({
        leaveCategory: 'Full Day Leave', // Full Day, Half Day
        leaveType: 'Sick Leave',         // Vacation/Function, Sick Leave, Casual Leave, Emergency
        startDate: '',
        endDate: '',
        detail: ''
    });

    const leaveTypes = [
        { id: 'Vacation/Function', label: 'Vacation/Function', icon: FaUmbrellaBeach, color: 'text-orange-500' },
        { id: 'Sick Leave', label: 'Sick Leave', icon: FaHospitalAlt, color: 'text-rose-500' },
        { id: 'Casual Leave', label: 'Casual Leave', icon: FaStreetView, color: 'text-sky-500' },
        { id: 'Emergency', label: 'Emergency', icon: FaPhoneVolume, color: 'text-amber-500' },
    ];

    const validateForm = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = new Date(form.startDate);
        const end = new Date(form.endDate);

        // 1. To date should be higher or equal to From date
        if (end < start) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Invalid Date Range',
                message: 'The "To" date cannot be earlier than the "From" date.'
            });
            return false;
        }

        // 2. Vacation/Function restriction: Submit before 7 days
        if (form.leaveType === 'Vacation/Function') {
            const minNoticeDate = new Date(today);
            minNoticeDate.setDate(today.getDate() + 7);

            if (start < minNoticeDate) {
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Advance Notice Required',
                    message: 'Vacation/Function requests must be submitted at least 7 days in advance.'
                });
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);
            await SharePointService.submitLeaveRequest({
                employeeName: employee?.name || 'Unknown',
                leaveType: form.leaveType,
                leaveCategory: form.leaveCategory,
                comments: form.detail,
                fromDate: form.startDate,
                toDate: form.endDate,
            });

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Request Submitted',
                message: `Your ${form.leaveType} request has been successfully sent for approval.`
            });
        } catch (error: unknown) {
            const err = error as Error;
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: err.message || 'There was an error submitting your request. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setModal({ ...modal, isOpen: false });
        if (modal.type === 'success') {
            navigate('/leave');
        }
    };

    return (
        <div className="h-full bg-[url('https://www.transparenttextures.com/patterns/floral-linen.png')] bg-gray-50 font-sans p-4 md:p-6 overflow-hidden flex flex-col relative">
            <div className="max-w-xl mx-auto w-full flex-1 overflow-y-auto flex flex-col">
                <div className="bg-white border-2 border-sky-500 rounded-3xl p-6 md:p-8 shadow-xl relative">
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-[100px] -z-0 opacity-50"></div>

                    <div className="relative z-10">
                        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">

                            {/* Leave Duration */}
                            <div>
                                <label className="block text-gray-700 text-xs font-black uppercase tracking-widest mb-2 md:mb-3">
                                    <span className="text-red-500 mr-1">*</span> Leave Duration
                                </label>
                                <div className="flex gap-3 md:gap-4 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                    {['Full Day Leave', 'Half Day Leave'].map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setForm({ ...form, leaveCategory: cat })}
                                            className={`flex-1 py-2 md:py-2.5 rounded-lg text-xs font-bold transition-all ${form.leaveCategory === cat
                                                ? 'bg-sky-600 text-white shadow-md'
                                                : 'text-gray-500 hover:text-sky-600'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Leave Type */}
                            <div>
                                <label className="block text-gray-700 text-xs font-black uppercase tracking-widest mb-2 md:mb-3">
                                    <span className="text-red-500 mr-1">*</span> Leave Type
                                </label>
                                <div className="grid grid-cols-2 gap-2 md:gap-3">
                                    {leaveTypes.map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, leaveType: type.id })}
                                            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border-2 transition-all group ${form.leaveType === type.id
                                                ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                                                : 'border-gray-100 hover:border-sky-200 hover:bg-white'
                                                }`}
                                        >
                                            <type.icon className={`text-base md:text-lg transition-transform group-hover:scale-110 ${form.leaveType === type.id ? type.color : 'text-gray-400'}`} />
                                            <span className={`text-[10px] md:text-[11px] font-bold ${form.leaveType === type.id ? 'text-sky-800' : 'text-gray-600'}`}>
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {form.leaveType === 'Vacation/Function' && (
                                    <p className="mt-2 text-[10px] text-orange-600 font-bold bg-orange-50 p-2 rounded flex items-center gap-2">
                                        <span>⚠️</span> Requires 7 days advance notice from today.
                                    </p>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-gray-700 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <span className="text-red-500">*</span> From
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            className="w-full border-2 border-gray-100 rounded-xl p-2 md:p-3 text-xs font-bold text-gray-700 focus:border-sky-500 outline-none transition-colors"
                                            value={form.startDate}
                                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        />
                                        <FaCalendarAlt className="absolute right-3 md:right-4 top-[10px] md:top-[14px] text-sky-600 pointer-events-none opacity-50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <span className="text-red-500">*</span> To
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            className="w-full border-2 border-gray-100 rounded-xl p-2 md:p-3 text-xs font-bold text-gray-700 focus:border-sky-500 outline-none transition-colors"
                                            value={form.endDate}
                                            onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        />
                                        <FaCalendarAlt className="absolute right-3 md:right-4 top-[10px] md:top-[14px] text-sky-600 pointer-events-none opacity-50" />
                                    </div>
                                </div>
                            </div>

                            {/* Detail */}
                            <div>
                                <label className="block text-gray-700 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <span className="text-red-500">*</span> Reason (Detail)
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full border-2 border-sky-700 rounded-xl p-3 md:p-4 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none resize-none bg-sky-50/10 placeholder-gray-400"
                                    placeholder="Please provide details about your leave request..."
                                    value={form.detail}
                                    onChange={e => setForm({ ...form, detail: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="text-center pt-3 md:pt-4 mt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#ff7b7b] text-white py-3 px-12 rounded-xl font-black uppercase tracking-[0.2em] hover:bg-[#ff5d5d] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-xs mx-auto block"
                                >
                                    {loading ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <NotificationModal
                isOpen={modal.isOpen}
                onClose={handleModalClose}
                type={modal.type}
                title={modal.title}
                message={modal.message}
            />
        </div>
    );
};
