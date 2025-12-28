import React from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error';
    title: string;
    message: string;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, type, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-all scale-100 animate-scale-up border-t-8 border-transparent"
                style={{ borderColor: type === 'success' ? '#22c55e' : '#ef4444' }}>
                <div className="flex justify-center mb-4">
                    {type === 'success' ? (
                        <div className="bg-green-100 p-4 rounded-full">
                            <FaCheckCircle className="text-5xl text-green-500" />
                        </div>
                    ) : (
                        <div className="bg-red-100 p-4 rounded-full">
                            <FaTimesCircle className="text-5xl text-red-500" />
                        </div>
                    )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">{message}</p>
                <button
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-semibold text-white shadow-md transition-all transform hover:-translate-y-1 ${type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                        }`}
                >
                    {type === 'success' ? 'Continue' : 'Try Again'}
                </button>
            </div>
        </div>
    );
};
