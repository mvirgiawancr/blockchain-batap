import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Shield, Clock, Award, FileText, ChevronDown, ChevronUp, Hash, Building2, CheckCircle2, XCircle, AlertCircle, Download, ExternalLink } from 'lucide-react';
import Sidebar, { getMenuForRole } from '../components/Sidebar';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Pinata gateway base
const IPFS_GATEWAY = 'https://ivory-fancy-junglefowl-107.mypinata.cloud/ipfs/';

export default function TraceabilityPage({ user }) {
  const navigate = useNavigate();
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
      'Unggul': 'bg-amber-50 text-amber-800 border-amber-250/50',
      'Baik Sekali': 'bg-emerald-50 text-emerald-800 border-emerald-250/50',
      'Baik': 'bg-indigo-50 text-indigo-800 border-indigo-250/50',
      'Tidak Terakreditasi': 'bg-rose-50 text-rose-800 border-rose-250/50'
    };
    return colors[rank] || 'bg-slate-50 text-slate-800 border-slate-250/50';
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

  const getPhaseFromHistory = (tx, allHistory, idx) => {
    const status = tx.status || '';
    const actor = tx.updatedBy || '';
    const msp = tx.updatedByMsp || '';

    if (status === 'under_review' && idx >= allHistory.length - 2) {
      return { label: 'Dokumen Disubmit', icon: '📄', color: 'bg-indigo-500', description: 'Dokumen akreditasi disubmit oleh UPPS' };
    }
    if (status === 'under_review') {
      return { label: 'Evaluasi Dokumen', icon: '📋', color: 'bg-blue-500', description: 'Dokumen dalam proses evaluasi' };
    }
    if (status === 'approved' && msp === 'SekretariatMSP' && actor === 'sekretariat') {
      return { label: 'Verifikasi Sekretariat', icon: '✅', color: 'bg-emerald-500', description: 'Dokumen diverifikasi oleh Sekretariat' };
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
      return { label: 'Keputusan Majelis', icon: '⚖️', color: 'bg-indigo-600', description: 'Keputusan final oleh Majelis Akreditasi' };
    }
    if (status === 'released') {
      return { label: 'Sertifikat Diterbitkan', icon: '🏆', color: 'bg-emerald-600', description: 'Sertifikat diterbitkan dan tersedia di IPFS' };
    }
    if (status === 'approved') {
      return { label: 'Persetujuan', icon: '✓', color: 'bg-slate-500', description: 'Tahap persetujuan' };
    }

    return { label: status || 'Update', icon: '📌', color: 'bg-slate-500', description: '' };
  };

  const getActorName = (tx) => {
    const actor = tx.updatedBy || '';
    const msp = tx.updatedByMsp || '';

    const actorMap = {
      'sekretariat': 'Sekretariat',
      'sekretariat_admin': 'Admin Sekretariat',
      'kea': 'Komite Eksekutif (KEA)',
      'kea_admin': 'Admin KEA',
      'majelis_ketua': 'Ketua Majelis',
      'upps_ti': 'UPPS TIN',
      'unknown': null,
    };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor);
    
    if (actorMap[actor]) {
      return actorMap[actor];
    }
    
    if (isUUID) {
      const mspMap = {
        'AsesorMSP': 'Asesor',
        'UPPSMSP': 'UPPS',
        'SekretariatMSP': 'Sekretariat',
        'KEAMSP': 'KEA',
        'MajelisMSP': 'Majelis',
      };
      return mspMap[msp] || 'Sistem';
    }

    if (actor.includes('.') || actor.includes(' ')) {
      return actor;
    }

    return actor || 'Sistem';
  };

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

  const getCertificateUrl = (cid) => {
    if (!cid) return null;
    if (cid.startsWith('QmCertFallback')) return null;
    return `${IPFS_GATEWAY}${cid}`;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {user && (
        <Sidebar
          user={user}
          onLogout={() => navigate('/login')}
          menuItems={getMenuForRole(user?.role || 'upps')}
        />
      )}

      <div className={`flex-1 overflow-auto ${user ? 'ml-64' : ''}`}>
        <div className="p-8 max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200/50 rounded-full px-4 py-1.5 mb-4 shadow-sm">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="text-indigo-800 text-xs font-black uppercase tracking-wider">Blockchain-Verified</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              Traceability Akreditasi
            </h1>
            <p className="text-slate-500 text-sm font-semibold max-w-2xl mx-auto leading-relaxed">
              Verifikasi dan telusuri sertifikat akreditasi yang tersimpan di blockchain. 
              Setiap keputusan tercatat secara permanen dan tidak dapat diubah.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: 'sk', label: 'Nomor SK', icon: Hash },
                  { id: 'institution', label: 'Institusi', icon: Building2 },
                  { id: 'submission', label: 'Submission ID', icon: FileText }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSearchType(id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      searchType === id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-650 bg-slate-100 hover:bg-slate-200/60 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      searchType === 'sk' ? 'Masukkan nomor SK (contoh: SK/LAM-TEK/2025/001)' :
                      searchType === 'institution' ? 'Masukkan nama institusi atau program studi' :
                      'Masukkan Submission ID'
                    }
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-805 text-sm font-semibold transition-all duration-205 shadow-inner-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer hover:-translate-y-0.5"
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
            <div className="max-w-3xl mx-auto mb-8 bg-rose-50 border border-rose-250/20 rounded-xl p-4 text-rose-700 font-semibold text-xs text-center flex items-center justify-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              {error}
            </div>
          )}

          {/* Results */}
          <div className="max-w-3xl mx-auto">
            {searched && !loading && results.length === 0 && (
              <div className="text-center py-16 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm max-w-2xl mx-auto">
                <XCircle className="w-16 h-16 text-slate-350 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-800 mb-2">Tidak Ditemukan</h3>
                <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                  Tidak ada hasil akreditasi yang cocok dengan pencarian Anda. Coba periksa kembali kata kunci pencarian Anda.
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-6">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  {results.length} hasil ditemukan
                </p>

                {results.map((item) => (
                  <div key={item.submissionId} className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-350 shadow-sm">
                    {/* Main Info */}
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-inner-sm ${getRankBadge(item.finalRank)}`}>
                              🏆 {item.finalRank || 'N/A'}
                            </span>
                            <span className="text-slate-400 text-xs font-bold">
                              Skor: <strong className="text-indigo-650 font-black">{item.finalScore || '-'}</strong>
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight leading-snug">
                            {item.programStudi}
                          </h3>
                          <p className="text-xs font-bold text-slate-500 mb-4">
                            {item.institusi}
                            {item.jenjang && item.jenjang !== 'N/A' ? ` • ${item.jenjang}` : ''}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Nomor SK</span>
                              <span className="text-xs font-black text-slate-800 font-mono">{item.skNumber || '-'}</span>
                            </div>
                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Tanggal SK</span>
                              <span className="text-xs font-black text-slate-800">{formatDate(item.skDate)}</span>
                            </div>
                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">Berlaku Sampai</span>
                              <span className="text-xs font-black text-slate-800">{formatDate(item.validUntil)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Certificate Badge + Download */}
                        <div className="flex flex-col items-center gap-2">
                          {item.certificateCid ? (
                            <div className="flex flex-col items-center gap-2 bg-emerald-50/50 border border-emerald-200/50 rounded-2xl p-4 w-full md:w-36 text-center">
                              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                              <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider">Sertifikat Terbit</span>
                              {getCertificateUrl(item.certificateCid) ? (
                                <a
                                  href={getCertificateUrl(item.certificateCid)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Download
                                </a>
                              ) : (
                                <span className="text-emerald-600 text-[9px] font-mono truncate max-w-32" title={item.certificateCid}>
                                  CID: {item.certificateCid.substring(0, 12)}...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 w-full md:w-36 text-center">
                              <Clock className="w-8 h-8 text-slate-450" />
                              <span className="text-slate-550 text-[10px] font-black uppercase tracking-wider">Belum Terbit</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Blockchain History Toggle */}
                    <div className="border-t border-slate-100">
                      <button
                        onClick={() => loadHistory(item.submissionId)}
                        className="w-full flex items-center justify-between px-6 py-3.5 text-xs font-black uppercase tracking-wider text-indigo-650 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Riwayat Blockchain (Audit Trail)
                        </div>
                        {expandedHistory === item.submissionId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedHistory === item.submissionId && (
                        <div className="px-6 pb-6 pt-4 border-t border-slate-100 bg-slate-50/10">
                          {historyLoading[item.submissionId] ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-indigo-250 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                          ) : historyData[item.submissionId] ? (
                            <div className="space-y-5">
                              {/* Decision Summary Card */}
                              {historyData[item.submissionId].decision && (
                                <div className="bg-gradient-to-tr from-emerald-50/80 via-emerald-50/30 to-green-50/15 border border-emerald-250/20 rounded-xl p-5 shadow-sm">
                                  <h4 className="text-emerald-800 font-black text-[10px] uppercase tracking-wider mb-3.5 flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    Keputusan Akreditasi Final
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                      <span className="text-emerald-600 text-[9px] font-black uppercase tracking-wider">Peringkat</span>
                                      <p className="text-emerald-950 font-black text-base mt-0.5">{historyData[item.submissionId].decision.finalRank}</p>
                                    </div>
                                    <div>
                                      <span className="text-emerald-600 text-[9px] font-black uppercase tracking-wider">Skor Final</span>
                                      <p className="text-emerald-950 font-black text-base mt-0.5">{historyData[item.submissionId].decision.finalScore}</p>
                                    </div>
                                    <div>
                                      <span className="text-emerald-600 text-[9px] font-black uppercase tracking-wider">Nomor SK</span>
                                      <p className="text-emerald-950 font-mono font-black text-sm mt-0.5">{historyData[item.submissionId].decision.skNumber}</p>
                                    </div>
                                    <div>
                                      <span className="text-emerald-600 text-[9px] font-black uppercase tracking-wider">Diputuskan oleh</span>
                                      <p className="text-emerald-950 font-bold mt-0.5">{historyData[item.submissionId].decision.decidedBy || 'Ketua Majelis'}</p>
                                    </div>
                                  </div>

                                  {/* Certificate Download in Decision Card */}
                                  {historyData[item.submissionId].decision.certificateCid && (
                                    <div className="mt-4 pt-3.5 border-t border-emerald-200/50 flex flex-wrap items-center gap-3">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      <span className="text-emerald-700 text-xs font-semibold">Sertifikat tersimpan aman di IPFS</span>
                                      {getCertificateUrl(historyData[item.submissionId].decision.certificateCid) && (
                                        <a
                                          href={getCertificateUrl(historyData[item.submissionId].decision.certificateCid)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors ml-auto cursor-pointer"
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
                                  const chronological = [...historyData[item.submissionId].blockchainHistory].reverse();
                                  const decision = historyData[item.submissionId].decision;
                                  
                                  const syntheticEntries = [];
                                  if (decision) {
                                    syntheticEntries.push({
                                      synthetic: true,
                                      phase: { label: 'Keputusan Majelis Akreditasi', icon: '⚖️', color: 'bg-indigo-600', description: `Peringkat: ${decision.finalRank} | Skor: ${decision.finalScore} | SK: ${decision.skNumber}` },
                                      actor: decision.decidedBy || 'Ketua Majelis',
                                      date: formatDateTime(decision.decidedAt),
                                      source: 'PostgreSQL'
                                    });
                                  }
                                  if (decision?.certificateCid) {
                                    syntheticEntries.push({
                                      synthetic: true,
                                      phase: { label: 'Sertifikat Diterbitkan', icon: '🏆', color: 'bg-emerald-650', description: decision.certificateCid.startsWith('QmCertFallback') ? 'Tersimpan di database (IPFS upload pending)' : `Tersimpan di IPFS: ${decision.certificateCid.substring(0, 20)}...` },
                                      actor: 'Sekretariat',
                                      date: formatDateTime(decision.certificateGeneratedAt),
                                      source: 'PostgreSQL + IPFS'
                                    });
                                  }

                                  const totalEntries = chronological.length + syntheticEntries.length;

                                  return (
                                    <div>
                                      <h4 className="text-slate-700 font-black text-xs uppercase tracking-wider mb-5 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-500" />
                                        Jejak Audit Blockchain ({totalEntries} tahap)
                                      </h4>
                                      <div className="relative pl-8 space-y-4">
                                        {/* Timeline line */}
                                        <div className="absolute left-3 top-2.5 bottom-2.5 w-0.5 bg-slate-200"></div>
                                        
                                        {chronological.map((tx, idx) => {
                                          const phase = getPhaseFromHistory(tx, chronological, chronological.length - 1 - idx);
                                          const actorName = getActorName(tx);
                                          const dateStr = formatDateTime(tx.timestamp);
                                          
                                          return (
                                            <div key={idx} className="relative">
                                              {/* Timeline dot */}
                                              <div className={`absolute -left-[29px] w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${phase.color} text-white shadow-sm ring-4 ring-white`}>
                                                <span>{phase.icon}</span>
                                              </div>
                                              
                                              <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-200">
                                                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                                                  <div>
                                                    <span className="font-black text-xs text-slate-900 uppercase tracking-wide">
                                                      {phase.label}
                                                    </span>
                                                    {actorName && (
                                                      <span className="text-slate-500 text-[10px] font-bold ml-2">
                                                        oleh <strong className="text-slate-700">{actorName}</strong>
                                                      </span>
                                                    )}
                                                    {tx.updatedByMsp && (
                                                      <span className="text-[10px] text-indigo-500 font-extrabold uppercase ml-1">
                                                        ({getMspLabel(tx.updatedByMsp)})
                                                      </span>
                                                    )}
                                                  </div>
                                                  {dateStr && (
                                                    <span className="text-slate-400 text-[9px] font-extrabold uppercase whitespace-nowrap bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                                      {dateStr}
                                                    </span>
                                                  )}
                                                </div>
                                                {phase.description && (
                                                  <p className="text-xs font-semibold text-slate-450 mt-1">{phase.description}</p>
                                                )}
                                                <div className="mt-2 text-[9px] text-slate-350 font-mono tracking-tight flex items-center gap-1" title={tx.txId}>
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
                                              <div className={`absolute -left-[29px] w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${isVeryLast ? 'ring-4 ring-emerald-100' : 'ring-4 ring-white'} ${entry.phase.color} text-white shadow-sm`}>
                                                <span>{entry.phase.icon}</span>
                                              </div>
                                              <div className={`border rounded-xl p-4 shadow-sm transition-all duration-200 ${isVeryLast ? 'bg-emerald-50/30 border-emerald-250/50' : 'bg-white border-slate-200/60'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                                                  <div>
                                                    <span className={`font-black text-xs uppercase tracking-wide ${isVeryLast ? 'text-emerald-900' : 'text-slate-900'}`}>
                                                      {entry.phase.label}
                                                    </span>
                                                    <span className="text-slate-500 text-[10px] font-bold ml-2">
                                                      oleh <strong className="text-slate-700">{entry.actor}</strong>
                                                    </span>
                                                  </div>
                                                  {entry.date && (
                                                    <span className="text-slate-400 text-[9px] font-extrabold uppercase whitespace-nowrap bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                                      {entry.date}
                                                    </span>
                                                  )}
                                                </div>
                                                {entry.phase.description && (
                                                  <p className="text-xs font-semibold text-slate-450 mt-1">{entry.phase.description}</p>
                                                )}
                                                <div className="mt-2 text-[9px] text-slate-350 font-mono tracking-tight flex items-center gap-1">
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
                                <div className="text-center py-6 text-slate-400 font-bold text-xs">
                                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                                  <p>Belum ada riwayat transaksi blockchain</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-rose-500 font-bold text-xs">
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
          </div>

          {/* Info Section — shown before search */}
          {!searched && (
            <div className="grid md:grid-cols-3 gap-6 mt-8 max-w-4xl mx-auto">
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
                <div key={i} className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-indigo-650" />
                  </div>
                  <h3 className="text-slate-900 font-black text-sm uppercase tracking-wider mb-2">{title}</h3>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
