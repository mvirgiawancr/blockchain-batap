import { useState, useEffect } from 'react';
import { X, History, Clock, User, FileCheck, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Modal component to display submission blockchain history (traceability)
 */
export default function SubmissionHistoryModal({ submissionId, programStudi, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (submissionId) {
      loadHistory();
    }
  }, [submissionId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // History could be in data.history or just data
        const historyData = data.history || data;
        setHistory(Array.isArray(historyData) ? historyData : []);
      } else {
        const err = await response.json();
        setError(err.message || 'Gagal memuat riwayat');
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Terjadi kesalahan saat memuat riwayat');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getActionIcon = (value) => {
    // Try to detect action type from the value
    if (!value) return <Clock className="w-4 h-4" />;
    
    const status = value.status?.toLowerCase() || '';
    if (status.includes('approved')) return <FileCheck className="w-4 h-4 text-green-600" />;
    if (status.includes('rejected')) return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-blue-600" />;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              Riwayat Transaksi Blockchain
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {programStudi || submissionId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Memuat riwayat blockchain...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadHistory}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada riwayat transaksi</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              
              {/* Timeline items */}
              <div className="space-y-4">
                {history.map((record, index) => (
                  <div key={record.txId || index} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow" />
                    
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      {/* Transaction header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(record.value)}
                          <span className="font-semibold text-gray-900">
                            {record.value?.status || 'Transaksi'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(record.timestamp || record.value?.createdAt || record.value?.updatedAt)}
                        </span>
                      </div>

                      {/* Transaction ID */}
                      {record.txId && (
                        <p className="text-xs text-gray-500 font-mono mb-2 break-all">
                          TX: {record.txId}
                        </p>
                      )}

                      {/* Submitter */}
                      {record.value?.submittedBy && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                          <User className="w-3 h-3" />
                          <span>{record.value.submittedBy}</span>
                        </div>
                      )}

                      {/* Expand/Collapse for details */}
                      <button
                        onClick={() => toggleExpand(index)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {expandedItems[index] ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Sembunyikan detail
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Lihat detail
                          </>
                        )}
                      </button>

                      {/* Expanded details */}
                      {expandedItems[index] && record.value && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(record.value, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Riwayat ini diambil langsung dari Hyperledger Fabric blockchain dan tidak dapat dimanipulasi
          </p>
        </div>
      </div>
    </div>
  );
}
