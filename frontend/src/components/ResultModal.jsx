import { CheckCircle, XCircle, AlertCircle, X, Sparkles } from 'lucide-react';

/**
 * ResultModal - Modern success/error modal component
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
      iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
      iconColor: 'text-white',
      borderColor: 'border-green-500',
      buttonBg: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
      confetti: true
    },
    error: {
      icon: XCircle,
      iconBg: 'bg-gradient-to-br from-red-400 to-rose-500',
      iconColor: 'text-white',
      borderColor: 'border-red-500',
      buttonBg: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
      confetti: false
    },
    info: {
      icon: AlertCircle,
      iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
      iconColor: 'text-white',
      borderColor: 'border-blue-500',
      buttonBg: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
      confetti: false
    }
  };

  const { icon: Icon, iconBg, iconColor, borderColor, buttonBg, confetti } = config[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-t-4 ${borderColor} animate-in fade-in zoom-in duration-300`}>
        {/* Confetti effect for success */}
        {confetti && (
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <Sparkles className="absolute top-4 left-8 w-6 h-6 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute top-8 right-12 w-4 h-4 text-green-400 animate-pulse" style={{animationDelay: '0.2s'}} />
            <Sparkles className="absolute top-12 left-16 w-3 h-3 text-blue-400 animate-pulse" style={{animationDelay: '0.4s'}} />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${iconBg} flex items-center justify-center shadow-lg transform transition-transform hover:scale-105`}>
            <Icon className={`w-10 h-10 ${iconColor}`} />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {title}
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            {message}
          </p>

          {/* Button */}
          <button
            onClick={onClose}
            className={`w-full py-3 px-6 ${buttonBg} text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
