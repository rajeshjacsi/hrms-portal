import React, { useState } from 'react';
import type { AttendanceRecord } from '../types/attendance';

interface RegularizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
    record: AttendanceRecord | null;
}

export const RegularizationModal: React.FC<RegularizationModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    record
}) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !record) return null;

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for regularization');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit(reason);
            setReason('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to submit regularization request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setReason('');
            setError('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Regularize Attendance</h3>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">Date:</span>
                        <span className="font-bold text-gray-800">{record.date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Check-In:</span>
                        <span className="font-bold text-gray-800">{record.checkInTime}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-600 font-medium">Check-Out:</span>
                        <span className="font-bold text-red-600">Missed</span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Regularization <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={4}
                        placeholder="Please provide a detailed reason for missing the checkout..."
                    />
                    {error && (
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !reason.trim()}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};
