import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message, onConfirm, confirmText = "OK" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title || 'Berhasil!'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {message || 'Operasi berhasil dilakukan.'}
                    </p>
                    <button
                        onClick={onConfirm || onClose}
                        className="w-full inline-flex justify-center items-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-200"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
