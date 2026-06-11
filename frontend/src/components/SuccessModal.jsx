import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message, onConfirm, confirmText = "OK" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/85 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200 relative">
                {/* Close absolute button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 border-0 bg-transparent cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center space-y-4 pt-2">
                    {/* Visual Seal badge */}
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                        <CheckCircle className="w-9 h-9" />
                    </div>

                    <div className="space-y-1.5">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                            {title || 'Berhasil!'}
                        </h3>
                        <p className="text-slate-500 text-xs font-semibold leading-relaxed px-2">
                            {message || 'Operasi berhasil dilakukan.'}
                        </p>
                    </div>
                </div>

                {/* Button container */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                        onClick={onConfirm || onClose}
                        className="w-full py-3 px-4 bg-gradient-to-tr from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-center border-0"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;

