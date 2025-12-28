import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-all scale-100 animate-scale-up border-t-8 ${isDestructive ? 'border-red-500' : 'border-blue-500'}`}>
                <div className="flex justify-center mb-4">
                    <div className={`p-4 rounded-full ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <FaExclamationTriangle className={`text-4xl ${isDestructive ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-600 mb-8 text-sm leading-relaxed">{message}</p>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md transition-all transform hover:-translate-y-1 ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
