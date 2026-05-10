import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Shield, Clock, Award, FileText, ChevronDown, ChevronUp, Hash, Building2, CheckCircle2, XCircle, AlertCircle, Download, ExternalLink } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Pinata gateway base
const IPFS_GATEWAY = 'https://ivory-fancy-junglefowl-107.mypinata.cloud/ipfs/';

export default function TraceabilityPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'sk');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [historyData, setHistoryData] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});

  useEffect(() => {
    if (searchParams.get('q')) {
      handleSearch();
    }
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q || q.length < 2) {
      setError('Masukkan minimal 2 karakter untuk pencarian');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await fetch(`${API_BASE_URL}/traceability/search?q=${encodeURIComponent(q)}&type=${searchType}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
      } else {
        setError(data.error || 'Gagal mencari data');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mencari. Pastikan server berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (submissionId) => {
    if (expandedHistory === submissionId) {
      setExpandedHistory(null);
      return;
    }
    setExpandedHistory(submissionId);
    if (historyData[submissionId]) return;

    setHistoryLoading(prev => ({ ...prev, [submissionId]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/traceability/history/${submissionId}`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(prev => ({ ...prev, [submissionId]: data.data }));
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const getRankBadge = (rank) => {
    const colors = {
      'Unggul': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Baik Sekali': 'bg-green-100 text-green-800 border-green-300',
      'Baik': 'bg-blue-100 text-blue-800 border-blue-300',
      'Tidak Terakreditasi': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[rank] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (d) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  // === Better status mapping for blockchain history ===
  const getPhaseFromHistory = (tx, allHistory, idx) => {
    const status = tx.status || '';
    const actor = tx.updatedBy || '';
    const msp = tx.updatedByMsp || '';

    // Map raw blockchain status + actor context to clear phase labels
    if (status === 'under_review' && idx >= allHistory.length - 2) {
      return { label: 'Dokumen Disubmit', icon: '📄', color: 'bg-blue-500', description: 'Dokumen akreditasi disubmit oleh UPPS' };
    }
    if (status === 'under_review') {
      return { label: 'Evaluasi Dokumen', icon: '📋', color: 'bg-indigo-500', description: 'Dokumen dalam proses evaluasi' };
    }
    if (status === 'approved' && msp === 'SekretariatMSP' && actor === 'sekretariat') {
      return { label: 'Verifikasi Sekretariat', icon: '✅', color: 'bg-teal-500', description: 'Dokumen diverifikasi oleh Sekretariat' };
    }
    if (status === 'approved' && msp === 'SekretariatMSP' && actor === 'kea') {
      return { label: 'Penugasan Asesor (KEA)', icon: '👥', color: 'bg-purple-500', description: 'Asesor ditugaskan oleh Komite Eksekutif' };
    }
    if (status === 'approved' && msp === 'AsesorMSP') {
      return { label: 'Penilaian Asesor (AK)', icon: '📊', color: 'bg-amber-500', description: `Skor diberikan oleh asesor` };
    }
    if (status === 'approved' && msp === 'UPPSMSP') {
      return { label: 'Persetujuan UPPS', icon: '🏫', color: 'bg-cyan-500', description: 'UPPS menyetujui penugasan asesor' };
    }
    if (status === 'approved' && msp === 'MajelisMSP') {
      return { label: 'Keputusan Majelis', icon: '⚖️', color: 'bg-green-600', description: 'Keputusan final oleh Majelis Akreditasi' };
    }
    if (status === 'released') {
      return { label: 'Sertifikat Diterbitkan', icon: '🏆', color: 'bg-green-700', description: 'Sertifikat diterbitkan dan tersedia di IPFS' };
    }
    if (status === 'approved') {
      return { label: 'Persetujuan', icon: '✓', color: 'bg-green-500', description: 'Tahap persetujuan' };
    }

    return { label: status || 'Update', icon: '📌', color: 'bg-gray-500', description: '' };
  };

  // Get clean actor name
  const getActorName = (tx) => {
    const actor = tx.updatedBy || '';
    const msp = tx.updatedByMsp || '';

    // Map known actors
    const actorMap = {
      'sekretariat': 'Sekretariat',
      'sekretariat_admin': 'Admin Sekretariat',
      'kea': 'Komite Eksekutif (KEA)',
      'kea_admin': 'Admin KEA',
      'majelis_ketua': 'Ketua Majelis',
      'upps_ti': 'UPPS TIN',
      'unknown': null,
    };

    // If actor is a UUID, try to get org from MSP
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor);
    
    if (actorMap[actor]) {
      return actorMap[actor];
    }
    
    if (isUUID) {
      // Map MSP to readable org
      const mspMap = {
        'AsesorMSP': 'Asesor',
        'UPPSMSP': 'UPPS',
        'SekretariatMSP': 'Sekretariat',
        'KEAMSP': 'KEA',
        'MajelisMSP': 'Majelis',
      };
      return mspMap[msp] || 'Sistem';
    }

    // If actor name looks like a person's name (contains dots/spaces), return as-is
    if (actor.includes('.') || actor.includes(' ')) {
      return actor;
    }

    return actor || 'Sistem';
  };

  // Get MSP readable name
  const getMspLabel = (msp) => {
    const map = {
      'AsesorMSP': 'Org. Asesor',
      'UPPSMSP': 'Org. UPPS',
      'SekretariatMSP': 'Org. Sekretariat',
      'KEAMSP': 'Org. KEA',
      'MajelisMSP': 'Org. Majelis',
    };
    return map[msp] || msp;
  };

  // Build IPFS download URL
  const getCertificateUrl = (cid) => {
    if (!cid) return null;
    if (cid.startsWith('QmCertFallback')) return null; // Fallback CID, no real file
    return `${IPFS_GATEWAY}${cid}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 rounded-full px-4 py-2 mb-4">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 text-sm font-medium">Blockchain-Verified</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Traceability Akreditasi
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Verifikasi dan telusuri sertifikat akreditasi yang tersimpan di blockchain. 
            Setiap keputusan tercatat secara permanen dan tidak dapat diubah.
          </p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex gap-2 mb-4">
              {[
                { id: 'sk', label: 'Nomor SK', icon: Hash },
                { id: 'institution', label: 'Institusi', icon: Building2 },
                { id: 'submission', label: 'Submission ID', icon: FileText }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchType(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    searchType === id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    searchType === 'sk' ? 'Masukkan nomor SK (contoh: SK/LAM-TEK/2025/001)' :
                    searchType === 'institution' ? 'Masukkan nama institusi atau program studi' :
                    'Masukkan Submission ID'
                  }
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="max-w-3xl mx-auto mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-16">
            <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Tidak Ditemukan</h3>
            <p className="text-gray-400">Tidak ada hasil akreditasi yang cocok dengan pencarian Anda</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-6 mt-6">
            <p className="text-sm font-medium text-gray-500">
              {results.length} hasil ditemukan
            </p>

            {results.map((item) => (
              <div key={item.submissionId} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all hover:shadow-xl">
                {/* Main Info */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getRankBadge(item.finalRank)}`}>
                          ⭐ {item.finalRank || 'N/A'}
                        </span>
                        <span className="text-gray-400 text-sm">
                          Skor: <strong className="text-gray-700">{item.finalScore || '-'}</strong>
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {item.programStudi}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {item.institusi}
                        {item.jenjang && item.jenjang !== 'N/A' ? ` • ${item.jenjang}` : ''}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <span className="text-gray-400 block mb-1">Nomor SK</span>
                          <span className="text-gray-900 font-mono font-semibold">{item.skNumber || '-'}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <span className="text-gray-400 block mb-1">Tanggal SK</span>
                          <span className="text-gray-900">{formatDate(item.skDate)}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <span className="text-gray-400 block mb-1">Berlaku Sampai</span>
                          <span className="text-gray-900">{formatDate(item.validUntil)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Certificate Badge + Download */}
                    <div className="flex flex-col items-center gap-2">
                      {item.certificateCid ? (
                        <div className="flex flex-col items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-4">
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                          <span className="text-green-700 text-xs font-semibold">Sertifikat Terbit</span>
                          {getCertificateUrl(item.certificateCid) ? (
                            <a
                              href={getCertificateUrl(item.certificateCid)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          ) : (
                            <span className="text-green-500 text-xs font-mono truncate max-w-32" title={item.certificateCid}>
                              CID: {item.certificateCid.substring(0, 12)}...
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <Clock className="w-8 h-8 text-gray-400" />
                          <span className="text-gray-500 text-xs font-semibold">Belum Diterbitkan</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Blockchain History Toggle */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => loadHistory(item.submissionId)}
                    className="w-full flex items-center justify-between px-6 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Riwayat Blockchain (Audit Trail)
                    </div>
                    {expandedHistory === item.submissionId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedHistory === item.submissionId && (
                    <div className="px-6 pb-6">
                      {historyLoading[item.submissionId] ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                      ) : historyData[item.submissionId] ? (
                        <div className="space-y-4">
                          {/* Decision Summary Card */}
                          {historyData[item.submissionId].decision && (
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
                              <h4 className="text-emerald-800 font-semibold mb-3 flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                Keputusan Akreditasi Final
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-emerald-500 text-xs">Peringkat</span>
                                  <p className="text-emerald-900 font-bold text-lg">{historyData[item.submissionId].decision.finalRank}</p>
                                </div>
                                <div>
                                  <span className="text-emerald-500 text-xs">Skor Final</span>
                                  <p className="text-emerald-900 font-bold text-lg">{historyData[item.submissionId].decision.finalScore}</p>
                                </div>
                                <div>
                                  <span className="text-emerald-500 text-xs">Nomor SK</span>
                                  <p className="text-emerald-900 font-mono font-semibold">{historyData[item.submissionId].decision.skNumber}</p>
                                </div>
                                <div>
                                  <span className="text-emerald-500 text-xs">Diputuskan oleh</span>
                                  <p className="text-emerald-900">{historyData[item.submissionId].decision.decidedBy || 'Ketua Majelis'}</p>
                                </div>
                              </div>

                              {/* Certificate Download in Decision Card */}
                              {historyData[item.submissionId].decision.certificateCid && (
                                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-3">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span className="text-emerald-700 text-sm font-medium">Sertifikat tersimpan di IPFS</span>
                                  {getCertificateUrl(historyData[item.submissionId].decision.certificateCid) && (
                                    <a
                                      href={getCertificateUrl(historyData[item.submissionId].decision.certificateCid)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors ml-auto"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Buka Sertifikat
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Clean Timeline */}
                          {historyData[item.submissionId].blockchainHistory?.length > 0 ? (
                            (() => {
                              // Reverse: oldest first (top) → newest last (bottom)
                              const chronological = [...historyData[item.submissionId].blockchainHistory].reverse();
                              const decision = historyData[item.submissionId].decision;
                              
                              // Build synthetic entries from PostgreSQL for steps not on-chain
                              const syntheticEntries = [];
                              if (decision) {
                                syntheticEntries.push({
                                  synthetic: true,
                                  phase: { label: 'Keputusan Majelis Akreditasi', icon: '⚖️', color: 'bg-green-600', description: `Peringkat: ${decision.finalRank} | Skor: ${decision.finalScore} | SK: ${decision.skNumber}` },
                                  actor: decision.decidedBy || 'Ketua Majelis',
                                  date: formatDateTime(decision.decidedAt),
                                  source: 'PostgreSQL'
                                });
                              }
                              if (decision?.certificateCid) {
                                syntheticEntries.push({
                                  synthetic: true,
                                  phase: { label: 'Sertifikat Diterbitkan', icon: '🏆', color: 'bg-green-700', description: decision.certificateCid.startsWith('QmCertFallback') ? 'Tersimpan di database (IPFS upload pending)' : `Tersimpan di IPFS: ${decision.certificateCid.substring(0, 20)}...` },
                                  actor: 'Sekretariat',
                                  date: formatDateTime(decision.certificateGeneratedAt),
                                  source: 'PostgreSQL + IPFS'
                                });
                              }

                              const totalEntries = chronological.length + syntheticEntries.length;

                              return (
                            <div>
                              <h4 className="text-gray-700 font-semibold mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                Jejak Audit Blockchain ({totalEntries} tahap)
                              </h4>
                              <div className="relative pl-8 space-y-3">
                                {/* Timeline line */}
                                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-green-400"></div>
                                
                                {chronological.map((tx, idx) => {
                                  const phase = getPhaseFromHistory(tx, chronological, chronological.length - 1 - idx);
                                  const actorName = getActorName(tx);
                                  const dateStr = formatDateTime(tx.timestamp);
                                  const isLast = idx === chronological.length - 1 && syntheticEntries.length === 0;
                                  
                                  return (
                                    <div key={idx} className="relative">
                                      {/* Timeline dot */}
                                      <div className={`absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs ${phase.color} text-white`}>
                                        <span>{phase.icon}</span>
                                      </div>
                                      
                                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <span className="font-semibold text-sm text-gray-900">
                                              {phase.label}
                                            </span>
                                            {actorName && (
                                              <span className="text-gray-500 text-xs ml-2">
                                                oleh <strong className="text-gray-700">{actorName}</strong>
                                              </span>
                                            )}
                                            {tx.updatedByMsp && (
                                              <span className="text-xs text-blue-400 ml-1">
                                                ({getMspLabel(tx.updatedByMsp)})
                                              </span>
                                            )}
                                          </div>
                                          {dateStr && (
                                            <span className="text-gray-400 text-xs whitespace-nowrap bg-white px-2 py-0.5 rounded">
                                              {dateStr}
                                            </span>
                                          )}
                                        </div>
                                        {phase.description && (
                                          <p className="text-xs text-gray-400 mt-1">{phase.description}</p>
                                        )}
                                        <div className="mt-1.5 text-xs text-gray-300 font-mono flex items-center gap-1" title={tx.txId}>
                                          🔗 TX: {tx.txId ? tx.txId.substring(0, 16) + '...' + tx.txId.substring(tx.txId.length - 8) : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Synthetic entries from PostgreSQL */}
                                {syntheticEntries.map((entry, idx) => {
                                  const isVeryLast = idx === syntheticEntries.length - 1;
                                  return (
                                    <div key={`syn-${idx}`} className="relative">
                                      <div className={`absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs ${isVeryLast ? 'ring-2 ring-offset-2 ring-green-300' : ''} ${entry.phase.color} text-white`}>
                                        <span>{entry.phase.icon}</span>
                                      </div>
                                      <div className={`border rounded-lg p-3 ${isVeryLast ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <span className={`font-semibold text-sm ${isVeryLast ? 'text-green-900' : 'text-gray-900'}`}>
                                              {entry.phase.label}
                                            </span>
                                            <span className="text-gray-500 text-xs ml-2">
                                              oleh <strong className="text-gray-700">{entry.actor}</strong>
                                            </span>
                                          </div>
                                          {entry.date && (
                                            <span className="text-gray-400 text-xs whitespace-nowrap bg-white px-2 py-0.5 rounded">
                                              {entry.date}
                                            </span>
                                          )}
                                        </div>
                                        {entry.phase.description && (
                                          <p className="text-xs text-gray-400 mt-1">{entry.phase.description}</p>
                                        )}
                                        <div className="mt-1.5 text-xs text-gray-300 font-mono flex items-center gap-1">
                                          📋 Sumber: {entry.source}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                              );
                            })()
                          ) : (
                            <div className="text-center py-6 text-gray-400">
                              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Belum ada riwayat transaksi blockchain</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          Gagal memuat riwayat blockchain
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section — shown before search */}
        {!searched && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              {
                icon: Shield,
                title: 'Immutable Record',
                desc: 'Setiap keputusan akreditasi tercatat di blockchain Hyperledger Fabric dan tidak dapat diubah setelah dikonfirmasi.'
              },
              {
                icon: Clock,
                title: 'Audit Trail Lengkap',
                desc: 'Seluruh riwayat proses akreditasi dari submission hingga penerbitan sertifikat dapat ditelusuri secara transparan.'
              },
              {
                icon: Award,
                title: 'Verifikasi Sertifikat',
                desc: 'Cukup masukkan nomor SK untuk memverifikasi keaslian sertifikat akreditasi secara real-time.'
              }
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
