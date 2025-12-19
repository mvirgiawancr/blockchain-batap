import { useState, useEffect } from 'react';
import { X, History, Clock, User, FileCheck, AlertCircle, ChevronDown, ChevronUp, Upload, Eye, UserCheck, Star, CheckCircle } from 'lucide-react';

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
        const historyData = data.history || data;
        // Reverse to show chronological order (oldest first)
        const reversed = Array.isArray(historyData) ? [...historyData].reverse() : [];
        // Process history to detect changes
        const processed = processHistory(reversed);
        setHistory(processed);
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

  // Process history to detect what changed between transactions
  const processHistory = (records) => {
    const processed = [];
    
    for (let i = 0; i < records.length; i++) {
      const current = records[i];
      const previous = i > 0 ? records[i - 1] : null; // Now oldest first, so previous is i-1
      
      const changes = detectChanges(current.value, previous?.value);
      
      processed.push({
        ...current,
        changes,
        actionType: changes.actionType,
        actionLabel: changes.actionLabel,
        actor: changes.actor
      });
    }
    
    return processed;
  };

  // Detect what changed between two states
  const detectChanges = (current, previous) => {
    if (!current) return { actionType: 'unknown', actionLabel: 'Transaksi', actor: null };
    
    // Helper to get actor from current state
    const getActor = (val) => {
      if (!val) return null;
      // Check direct fields
      if (val.submittedBy && val.submittedBy !== 'unknown') return val.submittedBy;
      if (val.updatedBy && val.updatedBy !== 'unknown') return val.updatedBy;
      // Check MSP-based fallback
      if (val.submittedByMsp) return `User (${val.submittedByMsp.replace('MSP', '')})`;
      if (val.updatedByMsp) return `User (${val.updatedByMsp.replace('MSP', '')})`;
      // Check nested
      if (val.decision?.decidedBy) return val.decision.decidedBy;
      if (val.currentOffer?.offeredBy) return val.currentOffer.offeredBy;
      return null;
    };

    const result = {
      actionType: 'update',
      actionLabel: 'Update',
      actor: getActor(current),
      details: []
    };

    // First transaction (no previous)
    if (!previous) {
      result.actionType = 'create';
      result.actionLabel = 'Submission Dibuat';
      result.actor = getActor(current) || 'UPPS';
      return result;
    }

    // Check status change
    if (current.status !== previous.status) {
      if (current.status === 'approved') {
        result.actionType = 'approved';
        result.actionLabel = 'Disetujui';
        result.actor = current.decision?.decidedBy || current.updatedBy || 'Sekretariat';
      } else if (current.status === 'rejected') {
        result.actionType = 'rejected';
        result.actionLabel = 'Ditolak';
        result.actor = current.decision?.decidedBy || current.updatedBy || 'Sekretariat';
      } else if (current.status === 'under_review') {
        result.actionType = 'review';
        result.actionLabel = 'Dalam Review';
        result.actor = current.updatedBy || 'System';
      }
      result.details.push(`Status: ${previous.status} → ${current.status}`);
    }

    // Check AI added
    if (current.ai && !previous.ai) {
      result.actionType = 'ai_analysis';
      result.actionLabel = 'Analisis AI Ditambahkan';
      result.actor = current.updatedBy || 'AI System';
    }

    // Check scoring added/updated
    if (current.scoringResult && (!previous.scoringResult || 
        JSON.stringify(current.scoringResult) !== JSON.stringify(previous.scoringResult))) {
      result.actionType = 'scoring';
      result.actionLabel = 'Penilaian Diperbarui';
      result.actor = current.updatedBy || 'System';
    }

    // Check assessor assigned
    if (current.assignedAssessors && !previous.assignedAssessors) {
      result.actionType = 'assigned';
      result.actionLabel = 'Asesor Ditugaskan';
      result.actor = current.currentOffer?.offeredBy || 'KEA';
    }

    // Check offer made
    if (current.currentOffer && !previous.currentOffer) {
      result.actionType = 'offer';
      result.actionLabel = 'Penawaran Asesor';
      result.actor = current.currentOffer.offeredBy || 'KEA';
    }

    // Check version update (document revision)
    if (current.version !== previous.version) {
      result.actionType = 'revision';
      result.actionLabel = `Revisi v${current.version}`;
      result.actor = current.updatedBy || 'UPPS';
    }

    return result;
  };

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'create': return <Upload className="w-4 h-4 text-blue-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'review': return <Eye className="w-4 h-4 text-yellow-600" />;
      case 'ai_analysis': return <Star className="w-4 h-4 text-purple-600" />;
      case 'scoring': return <Star className="w-4 h-4 text-orange-600" />;
      case 'assigned': return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'offer': return <User className="w-4 h-4 text-blue-600" />;
      case 'revision': return <FileCheck className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'create': return 'bg-blue-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'review': return 'bg-yellow-500';
      case 'ai_analysis': return 'bg-purple-500';
      case 'scoring': return 'bg-orange-500';
      case 'assigned': return 'bg-green-500';
      case 'offer': return 'bg-blue-500';
      case 'revision': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  // Handle Fabric's protobuf timestamp format {seconds, nanos} or ISO string
  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      let date;
      if (ts.seconds) {
        date = new Date(ts.seconds * 1000 + Math.floor((ts.nanos || 0) / 1000000));
      } else if (typeof ts === 'string') {
        date = new Date(ts);
      } else if (typeof ts === 'number') {
        date = new Date(ts);
      } else {
        return '-';
      }
      
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
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
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-purple-300 to-gray-200" />
              
              {/* Timeline items */}
              <div className="space-y-4">
                {history.map((record, index) => (
                  <div key={record.txId || index} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-2 w-4 h-4 rounded-full ${getActionColor(record.actionType)} border-4 border-white shadow`} />
                    
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-100">
                      {/* Transaction header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(record.actionType)}
                          <span className="font-semibold text-gray-900">
                            {record.actionLabel}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {formatTimestamp(record.timestamp)}
                        </span>
                      </div>

                      {/* Actor */}
                      {record.actor && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                          <User className="w-3 h-3" />
                          <span>oleh <strong>{record.actor}</strong></span>
                        </div>
                      )}

                      {/* Transaction ID */}
                      {record.txId && (
                        <p className="text-xs text-gray-400 font-mono mb-2 truncate">
                          TX: {record.txId.substring(0, 20)}...
                        </p>
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
                          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-60">
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
            🔒 Riwayat ini diambil langsung dari Hyperledger Fabric blockchain dan tidak dapat dimanipulasi
          </p>
        </div>
      </div>
    </div>
  );
}
