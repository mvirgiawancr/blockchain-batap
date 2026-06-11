import { CheckCircle, XCircle, AlertCircle, X, Sparkles } from 'lucide-react';

/**
 * ResultModal - Modern success/error/info modal component with premium styling
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {function} props.onClose - Close handler
 * @param {string} props.type - 'success' | 'error' | 'info'
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message/description
 * @param {string} props.buttonText - Optional custom button text
 */
export default function ResultModal({ 
  isOpen, 
  onClose, 
  type = 'success', 
  title, 
  message,
  buttonText = 'Tutup'
}) {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle,
      iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100/30',
      borderColor: 'border-t-emerald-500',
      buttonBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600',
      confetti: true
    },
    error: {
      icon: XCircle,
      iconBg: 'bg-rose-50 border-rose-100 text-rose-600 shadow-rose-100/30',
      borderColor: 'border-t-rose-500',
      buttonBg: 'bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-650',
      confetti: false
    },
    info: {
      icon: AlertCircle,
      iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-650 shadow-indigo-100/30',
      borderColor: 'border-t-indigo-500',
      buttonBg: 'bg-gradient-to-tr from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750',
      confetti: false
    }
  };

  const { icon: Icon, iconBg, borderColor, buttonBg, confetti } = config[type] || config.success;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click handler */}
      <div 
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className={`relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-t-[6px] ${borderColor} p-6 flex flex-col items-center animate-in zoom-in-95 duration-200 border-x border-b border-slate-200/60`}>
        {/* Confetti sparkles effect for success */}
        {confetti && (
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <Sparkles className="absolute top-4 left-8 w-6 h-6 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute top-8 right-12 w-4 h-4 text-emerald-400 animate-pulse" style={{animationDelay: '0.2s'}} />
            <Sparkles className="absolute top-12 left-16 w-3 h-3 text-indigo-400 animate-pulse" style={{animationDelay: '0.4s'}} />
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer text-slate-400"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Modal Content */}
        <div className="flex flex-col items-center text-center space-y-4 pt-3 w-full">
          {/* Icon Circle */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-inner ${iconBg} transform transition-transform hover:scale-105 duration-300`}>
            <Icon className="w-9 h-9" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
              {message}
            </p>
          </div>

          {/* Action Button */}
          <div className="w-full pt-4 mt-6 border-t border-slate-100">
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 ${buttonBg} text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer border-0 text-center`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

