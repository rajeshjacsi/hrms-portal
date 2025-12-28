import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { SharePointService } from '../services/sharePointService';
import { NotificationModal } from '../components/NotificationModal';

export const PermissionRequest: React.FC = () => {
    const navigate = useNavigate();
    const { employee } = useUser();

    const [formData, setFormData] = useState({
        date: '',
        hours: '',
        reason: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [modal, setModal] = useState({
        isOpen: false,
        type: 'success' as 'success' | 'error',
        title: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee?.email) return;

        // Validate hours
        const hoursNum = parseFloat(formData.hours);
        if (isNaN(hoursNum) || hoursNum <= 0) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Invalid Hours',
                message: 'Please enter a valid number of hours (e.g., 1, 1.5, 2).'
            });
            return;
        }

        if (hoursNum > 2) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Hours Exceeded',
                message: 'Maximum permission allowed is 2 hours. More than 2 hours will be considered as half day leave.'
            });
            return;
        }

        setSubmitting(true);
        try {
            await SharePointService.createPermissionRequest({
                employeeEmail: employee.email,
                employeeName: employee.name,
                permissionType: hoursNum > 2 ? 'Half Day' : 'Permission',
                date: formData.date,
                hours: formData.hours,
                reason: formData.reason
            });

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Request Submitted',
                message: 'Your permission request has been successfully submitted for approval.'
            });
        } catch (error) {
            console.error('Failed to submit permission request', error);
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: 'Failed to submit permission request. Please try again or contact support if the issue persists.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleModalClose = () => {
        setModal({ ...modal, isOpen: false });
        if (modal.type === 'success') {
            navigate('/permission');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-400 p-8">
                {/* Note Section */}
                <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 font-medium text-center">
                        Note: Maximum Permission Allowed is 2:00 Hours. More than 2 Hours will consider as Halfday.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Date and Hours Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date */}
                        <div>
                            <label className="block text-blue-700 font-semibold mb-2">
                                *Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Hours */}
                        <div>
                            <label className="block text-blue-700 font-semibold mb-2">
                                *Hours
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="2"
                                required
                                value={formData.hours}
                                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                                placeholder="Enter hours (e.g., 1.5)"
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-blue-700 font-semibold mb-2">
                            *Reason
                        </label>
                        <textarea
                            required
                            rows={6}
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Please provide details about your permission request..."
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-12 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {submitting ? 'SUBMITTING...' : 'SUBMIT'}
                        </button>
                    </div>
                </form>
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

