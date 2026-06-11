import { useState, useEffect } from 'react';
import { X, History, Clock, User, FileCheck, AlertCircle, ChevronDown, ChevronUp, Upload, Eye, UserCheck, Star, CheckCircle, ShieldCheck, Award, Calendar, Stamp, FileText } from 'lucide-react';

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

    const actor = getActor(current);

    const result = {
      actionType: 'update',
      actionLabel: 'Pembaruan Berkas',
      actor: actor,
      details: []
    };

    // First transaction (no previous)
    if (!previous) {
      result.actionType = 'create';
      result.actionLabel = 'Pengajuan Diajukan';
      result.actor = actor || 'UPPS';
      return result;
    }

    // Check status change
    if (current.status !== previous.status) {
      if (current.status === 'approved') {
        result.actionType = 'approved';
        result.actionLabel = 'Pengajuan Disetujui';
        result.actor = current.decision?.decidedBy || current.updatedBy || 'Sekretariat';
      } else if (current.status === 'rejected') {
        result.actionType = 'rejected';
        result.actionLabel = 'Pengajuan Ditolak';
        result.actor = current.decision?.decidedBy || current.updatedBy || 'Sekretariat';
      } else if (current.status === 'under_review') {
        result.actionType = 'review';
        result.actionLabel = 'Dalam Tinjauan Asesor';
        result.actor = current.updatedBy || 'System';
      } else if (current.status === 'completed') {
        result.actionType = 'completed';
        result.actionLabel = 'Asesmen Lapangan Selesai';
        result.actor = 'Asesor & UPPS';
      } else if (current.status === 'verified') {
        result.actionType = 'verified';
        result.actionLabel = 'Hasil AL Diverifikasi KEA';
        result.actor = 'kea';
      } else if (current.status === 'accredited') {
        result.actionType = 'accredited';
        result.actionLabel = 'Sidang Majelis: Peringkat Ditetapkan';
        result.actor = 'majelis_ketua';
      } else if (current.status === 'released') {
        result.actionType = 'released';
        result.actionLabel = 'Sertifikat Resmi Dirilis';
        result.actor = 'sekretariat';
      }
      result.details.push(`Status: ${previous.status} → ${current.status}`);
      return result;
    }

    // Check AI added
    if (current.ai && !previous.ai) {
      result.actionType = 'ai_analysis';
      result.actionLabel = 'Analisis AI Ditambahkan';
      result.actor = current.updatedBy || 'Gemini AI';
      return result;
    }

    // Check scoring added/updated
    if (current.scoringResult && (!previous.scoringResult || 
        JSON.stringify(current.scoringResult) !== JSON.stringify(previous.scoringResult))) {
      result.actionType = 'scoring';
      result.actionLabel = 'Skoring AI Diperbarui';
      result.actor = current.updatedBy || 'AI System';
      return result;
    }

    // Check assessor assigned
    if (current.assignedAssessors && !previous.assignedAssessors) {
      result.actionType = 'assigned';
      result.actionLabel = 'Asesor Ditugaskan';
      result.actor = current.currentOffer?.offeredBy || 'KEA';
      return result;
    }

    // Check offer made
    if (current.currentOffer && !previous.currentOffer) {
      result.actionType = 'offer';
      result.actionLabel = 'Penawaran Asesor Diterbitkan';
      result.actor = current.currentOffer.offeredBy || 'KEA';
      return result;
    }

    // Check version update (document revision)
    if (current.version !== previous.version) {
      result.actionType = 'revision';
      result.actionLabel = `Revisi Berkas v${current.version}`;
      result.actor = current.updatedBy || 'UPPS';
      return result;
    }

    // Check decision/accreditation finalized
    if (current.accreditationDecision || actor === 'majelis_ketua') {
      result.actionType = 'accredited';
      result.actionLabel = 'Sidang Majelis: Peringkat Ditetapkan';
      result.actor = 'majelis_ketua';
      return result;
    }

    // Check KEA verifying AL
    if (actor === 'kea' && (current.verificationResult || current.verified_score)) {
      result.actionType = 'verified';
      result.actionLabel = 'Hasil AL Diverifikasi KEA';
      result.actor = 'kea';
      return result;
    }

    // Check assessor AL report
    if (current.alExecution || (actor && (actor.includes('Dr.') || actor.includes('Prof.')))) {
      result.actionType = 'al_report';
      result.actionLabel = `Laporan Temuan AL Disubmit: ${actor || 'Asesor'}`;
      result.actor = actor;
      return result;
    }

    // Check UPPS responding to Temuan
    if (current.alResponse || (actor && actor.includes('upps'))) {
      result.actionType = 'al_response';
      result.actionLabel = 'Tanggapan Temuan AL Disubmit UPPS';
      result.actor = actor;
      return result;
    }

    // Check UPPS responding to scheduling offer / schedule approval
    if (actor && (actor.match(/^[0-9a-fA-F-]{36}$/) || actor.includes('upps_')) && current.alSchedule) {
      // UPPS scheduling approval or Assessor accept offer
      if (previous.alSchedule && current.alSchedule && current.alSchedule.status === 'approved') {
        result.actionType = 'upps_schedule_approve';
        result.actionLabel = 'UPPS Menyetujui Jadwal AL';
        result.actor = 'UPPS';
        return result;
      }
      
      // Assessor accepting assignment offer
      result.actionType = 'assessor_accept';
      result.actionLabel = 'Asesor Menerima Penawaran Penugasan';
      result.actor = actor;
      return result;
    }

    // Check Scheduling AL proposed
    if (actor === 'kea' && current.alSchedule) {
      result.actionType = 'al_scheduling';
      result.actionLabel = 'Jadwal Asesmen Lapangan Diajukan KEA';
      result.actor = 'KEA';
      return result;
    }

    // Check Assessor responding to Penawaran
    if (actor && actor.match(/^[0-9a-fA-F-]{36}$/) && current.currentOffer) {
      result.actionType = 'assessor_accept';
      result.actionLabel = 'Asesor Menerima Penawaran Penugasan';
      result.actor = actor;
      return result;
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
      case 'create': return <Upload className="w-4 h-4 text-white" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-white" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-white" />;
      case 'review': return <Eye className="w-4 h-4 text-white" />;
      case 'ai_analysis': return <Star className="w-4 h-4 text-white" />;
      case 'scoring': return <Star className="w-4 h-4 text-white" />;
      case 'assigned': return <UserCheck className="w-4 h-4 text-white" />;
      case 'offer': return <User className="w-4 h-4 text-white" />;
      case 'revision': return <FileCheck className="w-4 h-4 text-white" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-white" />;
      case 'verified': return <ShieldCheck className="w-4 h-4 text-white" />;
      case 'accredited': return <Award className="w-4 h-4 text-white" />;
      case 'released': return <Stamp className="w-4 h-4 text-white" />;
      case 'al_report': return <FileText className="w-4 h-4 text-white" />;
      case 'al_response': return <FileCheck className="w-4 h-4 text-white" />;
      case 'al_scheduling': return <Calendar className="w-4 h-4 text-white" />;
      case 'assessor_accept': return <UserCheck className="w-4 h-4 text-white" />;
      case 'upps_schedule_approve': return <CheckCircle className="w-4 h-4 text-white" />;
      default: return <Clock className="w-4 h-4 text-white" />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'create': return 'bg-gradient-to-br from-blue-500 to-indigo-500';
      case 'approved': return 'bg-gradient-to-br from-emerald-500 to-teal-500';
      case 'rejected': return 'bg-gradient-to-br from-rose-500 to-red-500';
      case 'review': return 'bg-gradient-to-br from-amber-400 to-amber-500';
      case 'ai_analysis': return 'bg-gradient-to-br from-purple-500 to-fuchsia-500';
      case 'scoring': return 'bg-gradient-to-br from-violet-500 to-indigo-500';
      case 'assigned': return 'bg-gradient-to-br from-emerald-500 to-green-500';
      case 'offer': return 'bg-gradient-to-br from-sky-500 to-blue-500';
      case 'revision': return 'bg-gradient-to-br from-cyan-500 to-teal-500';
      case 'completed': return 'bg-gradient-to-br from-slate-500 to-slate-600';
      case 'verified': return 'bg-gradient-to-br from-teal-500 to-emerald-650';
      case 'accredited': return 'bg-gradient-to-br from-purple-650 to-indigo-700';
      case 'released': return 'bg-gradient-to-br from-emerald-600 to-teal-650';
      case 'al_report': return 'bg-gradient-to-br from-amber-500 to-orange-500';
      case 'al_response': return 'bg-gradient-to-br from-emerald-550 to-emerald-600';
      case 'al_scheduling': return 'bg-gradient-to-br from-blue-500 to-cyan-550';
      case 'assessor_accept': return 'bg-gradient-to-br from-violet-500 to-purple-500';
      case 'upps_schedule_approve': return 'bg-gradient-to-br from-emerald-500 to-teal-500';
      default: return 'bg-gradient-to-br from-slate-500 to-slate-650';
    }
  };

  const getTimelineDotBorder = (actionType) => {
    switch (actionType) {
      case 'approved':
      case 'assigned':
        return 'border-emerald-200';
      case 'rejected':
        return 'border-rose-200';
      case 'review':
        return 'border-amber-200';
      default:
        return 'border-indigo-200';
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Color accent line on top */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-650 to-purple-500" />
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <History className="w-6 h-6 text-indigo-650" />
              Riwayat Transaksi Blockchain
            </h2>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase mt-1.5 tracking-wider bg-slate-100/80 border border-slate-200 px-3 py-1 rounded-md inline-block font-mono">
              {programStudi || submissionId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-150 hover:text-slate-800 rounded-xl transition-colors text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-16">
              <History className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-sm">Menghubungkan ke ledger blockchain Fabric...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
              <p className="text-rose-700 font-black text-sm">{error}</p>
              <button
                onClick={loadHistory}
                className="mt-4 px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
              >
                Coba Lagi
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-sm">Belum ada riwayat transaksi blockchain untuk berkas ini</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4.5 top-2.5 bottom-2.5 w-0.5 bg-gradient-to-b from-blue-300 via-indigo-350 to-purple-250 pointer-events-none" />
              
              {/* Timeline items */}
              <div className="space-y-5">
                {history.map((record, index) => (
                  <div key={record.txId || index} className="relative pl-11">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 top-3.5 w-4 h-4 rounded-full ${getActionColor(record.actionType)} border-4 border-white shadow flex items-center justify-center`} />
                    
                    <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-4.5 hover:border-slate-350 hover:bg-slate-50/20 transition-all duration-200 shadow-sm">
                      {/* Transaction header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm ${getActionColor(record.actionType)}`}>
                            {getActionIcon(record.actionType)}
                          </div>
                          <span className="font-black text-slate-800 text-sm tracking-tight">
                            {record.actionLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-md inline-block shadow-inner">
                          {formatTimestamp(record.timestamp)}
                        </span>
                      </div>

                      {/* Actor */}
                      {record.actor && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-550 font-semibold mb-2 bg-slate-50/50 py-1.5 px-3 rounded-lg border border-slate-100/80 w-fit">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Otoritas Pengesah: <strong className="font-black text-slate-800">{record.actor}</strong></span>
                        </div>
                      )}

                      {/* Transaction ID */}
                      {record.txId && (
                        <div className="text-[10px] text-slate-400 font-bold font-mono tracking-tight flex items-center gap-1 bg-slate-50/30 px-2.5 py-1 rounded border border-slate-150/40 w-fit max-w-full truncate mb-3">
                          <span className="font-black text-slate-500 uppercase tracking-wider mr-1 text-[9px]">Hash TX:</span>
                          <span className="truncate">{record.txId}</span>
                        </div>
                      )}

                      {/* Expand/Collapse for details */}
                      <button
                        onClick={() => toggleExpand(index)}
                        className="text-[10px] font-black text-indigo-650 hover:text-indigo-850 flex items-center gap-1 uppercase tracking-wider transition-colors duration-150 mt-1 cursor-pointer"
                      >
                        {expandedItems[index] ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Sembunyikan Ledger JSON
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Lihat Blok Ledger JSON
                          </>
                        )}
                      </button>

                      {/* Expanded details */}
                      {expandedItems[index] && record.value && (
                        <div className="mt-3.5 p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 max-h-60 overflow-y-auto font-mono text-[10px] leading-relaxed shadow-lg">
                          <pre className="whitespace-pre-wrap">
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
        <div className="p-4 border-t border-slate-150 bg-slate-50/80 text-[10px] text-slate-450 font-black tracking-wider uppercase text-center flex items-center justify-center gap-1.5 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Informasi ledger ini tersertifikasi Hyperledger Fabric Blockchain & Bersifat Imutabel</span>
        </div>
      </div>
    </div>
  );
}
