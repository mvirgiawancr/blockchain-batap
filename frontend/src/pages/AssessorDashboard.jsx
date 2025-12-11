import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissions, manualScore, acceptAssignment, rejectAssignment } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { ClipboardCheck, Clock, CheckCircle, XCircle, FileText, AlertCircle, Download, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AssessorDashboard({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [manualNotes, setManualNotes] = useState('');
  const [manualScores, setManualScores] = useState({});
  const [scoringResult, setScoringResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('pending');
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
  const [downloading, setDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
    const wsId = (user && (user.username || user.id)) || 'assessor';
    wsService.connect(wsId);
    wsService.on('SubmissionAssigned', loadSubmissions);
    wsService.on('SubmissionDecided', loadSubmissions);
    return () => wsService.disconnect();
  }, [user]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      // ambil semua; pada UI sederhana ini filter manual untuk assignedAssessorId === user.id
      const res = await getAllSubmissions();
      const list = Array.isArray(res.data) ? res.data : [];
      const mine = user?.id ? list.filter((s) => s.assignedAssessorId === user.id) : list;
      const totals = {
        total: mine.length,
        pending: mine.filter((s) => (s.assignmentStatus || s.assignment_status || 'pending') === 'pending').length,
        accepted: mine.filter((s) => (s.assignmentStatus || s.assignment_status || 'pending') === 'accepted').length,
        rejected: mine.filter((s) => (s.assignmentStatus || s.assignment_status || 'pending') === 'rejected').length
      };
      setStats(totals);
      setSubmissions(mine);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (!selected) return;
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/download/${selected.submissionId}/${doc.type}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || `${doc.type}.file`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const openSubmission = (sub) => {
    setSelected(sub);
    setScoringResult(sub?.scoringResult || null);
    setAssignmentStatus(sub.assignmentStatus || sub.assignment_status || 'pending');
    setStatusMsg('');
    setErrorMsg('');
  };

  const handleManualScore = async () => {
    if (!selected) return;
    try {
      setStatusMsg('Menyimpan skor manual...');
      setErrorMsg('');
      const res = await manualScore({
        submissionId: selected.submissionId,
        manualScores,
        notes: manualNotes,
        programType: selected.programType || 'S'
      });
      setScoringResult(res.scoring);
      setStatusMsg('Skor manual disimpan. Tunggu keputusan Sekretariat.');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  const handleAccept = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      await acceptAssignment(selected.submissionId);
      setAssignmentStatus('accepted');
      setStatusMsg('Penugasan diterima.');
      await loadSubmissions();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      await rejectAssignment(selected.submissionId, { notes: 'Ditolak oleh assessor' });
      setAssignmentStatus('rejected');
      setStatusMsg('Penugasan ditolak.');
      await loadSubmissions();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')} 
        menuItems={getMenuForRole('asesor')} 
      />
      
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <header className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500">Assessor Panel</p>
              <h1 className="text-2xl font-bold text-slate-900">Skoring Manual</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadSubmissions}
                className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-indigo-600" />
              </button>
              <ClipboardCheck className="w-10 h-10 text-indigo-600" />
            </div>
          </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-indigo-500">
            <p className="text-sm text-slate-500">Total Penugasan</p>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-amber-500">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-emerald-500">
            <p className="text-sm text-slate-500">Diterima</p>
            <p className="text-3xl font-bold text-slate-900">{stats.accepted}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-rose-500">
            <p className="text-sm text-slate-500">Ditolak</p>
            <p className="text-3xl font-bold text-slate-900">{stats.rejected}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Penugasan
              </h3>
              <span className="text-xs text-slate-500">{loading ? 'Memuat...' : `${submissions.length} items`}</span>
            </div>
            {loading && <p className="text-sm text-slate-500">Memuat...</p>}
            {!loading && submissions.length === 0 && (
              <p className="text-sm text-slate-500">Tidak ada submission yang ditugaskan.</p>
            )}
            {!loading && submissions.map((s) => (
              <button
                key={s.submissionId || s.id}
                onClick={() => openSubmission(s)}
                className={`w-full text-left px-3 py-2 rounded-xl border ${
                  selected?.submissionId === s.submissionId ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between text-sm font-semibold text-slate-800">
                  <span>{s.programStudi}</span>
                  <span className="text-xs text-slate-500">Penugasan: {s.assignmentStatus || s.assignment_status || 'pending'}</span>
                </div>
                <p className="text-xs text-slate-500">{s.institusi}</p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
            {!selected && <p className="text-sm text-slate-500">Pilih submission untuk mulai skoring.</p>}
            {selected && (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <h3 className="text-xl font-bold text-slate-900">{selected.programStudi}</h3>
                    <p className="text-sm text-slate-500">{selected.institusi}</p>
                  </div>
                  <div className="text-sm text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${assignmentStatus === 'accepted' ? 'bg-emerald-100 text-emerald-700' : assignmentStatus === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {assignmentStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800">Skor AI (pembanding)</h4>
                  <div className="text-sm text-slate-600 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 space-y-2">
                    <p>Final Score AI: {selected.ai?.scoring?.finalScore?.toFixed(2) || '-'}</p>
                    <p>Akreditasi AI: {selected.ai?.scoring?.akreditasi || '-'}</p>
                    {selected.ai?.scoring?.criteriaScores && (
                      <div className="border-t border-indigo-100 pt-3">
                        <p className="font-semibold text-slate-700 mb-2">Per Kriteria (AI)</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          {Object.values(selected.ai.scoring.criteriaScores).map((c) => (
                            <div key={c.criteriaNumber} className="text-xs bg-white border border-indigo-100 rounded-lg px-3 py-2 shadow-sm">
                              <p className="font-semibold text-slate-800">
                                Kriteria {c.criteriaNumber} {c.criteriaName}
                              </p>
                              <p className="text-slate-600">Skor: {c.averageScore?.toFixed(2) || c.totalScore || '-'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow hover:shadow-md"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Memproses...' : 'Terima Penugasan'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold shadow hover:shadow-md"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Memproses...' : 'Tolak Penugasan'}
                  </button>
                  <span className="text-xs text-slate-500">
                    Status penugasan: {assignmentStatus}
                  </span>
                </div>

                {assignmentStatus !== 'accepted' && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    Terima penugasan untuk membuka dokumen dan mengisi skor manual.
                  </div>
                )}

                {assignmentStatus === 'accepted' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800">Input Skor Manual</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(selected.ai?.scoring?.criteriaScores ? Object.values(selected.ai.scoring.criteriaScores) : [
                        { criteriaNumber: 1, criteriaName: 'Kriteria 1' },
                        { criteriaNumber: 2, criteriaName: 'Kriteria 2' },
                        { criteriaNumber: 3, criteriaName: 'Kriteria 3' },
                        { criteriaNumber: 4, criteriaName: 'Kriteria 4' },
                        { criteriaNumber: 5, criteriaName: 'Kriteria 5' },
                        { criteriaNumber: 6, criteriaName: 'Kriteria 6' },
                        { criteriaNumber: 7, criteriaName: 'Kriteria 7' }
                      ]).map((c) => (
                        <div key={c.criteriaNumber || c.number} className="border border-slate-200 rounded-xl p-3">
                          <p className="text-sm font-semibold text-slate-800">
                            Kriteria {c.criteriaNumber || c.number} {c.criteriaName || c.name || ''}
                          </p>
                          <input
                            type="number"
                            min="0"
                            max="4"
                            step="0.01"
                            className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            value={manualScores[c.criteriaNumber || c.number] || ''}
                            onChange={(e) =>
                              setManualScores({
                                ...manualScores,
                                [c.criteriaNumber || c.number]: e.target.value
                              })
                            }
                            placeholder="0 - 4"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assignmentStatus === 'accepted' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Catatan Manual</label>
                    <textarea
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Catatan penilaian manual Anda"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800">Dokumen</h4>
                  <div className="flex flex-wrap gap-3">
                    {selected.documents?.map((doc) => (
                      <button
                        key={doc.type}
                        onClick={() => handleDownload(doc)}
                        disabled={assignmentStatus !== 'accepted' || downloading}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                          assignmentStatus === 'accepted'
                            ? 'border-slate-200 text-indigo-700 hover:bg-indigo-50'
                            : 'border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        {doc.type} ({doc.filename || 'file'})
                      </button>
                    ))}
                  </div>
                </div>

                {assignmentStatus === 'accepted' && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleManualScore}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:shadow-md"
                    >
                      Simpan Skor Manual
                    </button>
                  </div>
                )}

                {statusMsg && <p className="text-sm text-emerald-600">{statusMsg}</p>}
                {errorMsg && (
                  <div className="text-sm text-rose-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </div>
                )}

                {scoringResult && (
                  <div className="border border-slate-200 rounded-xl p-3">
                    <h4 className="font-semibold text-slate-800 mb-2">Skor Manual</h4>
                    <p className="text-sm text-slate-600">
                      Final Score: {scoringResult.finalScore?.toFixed(2)} / {scoringResult.maxPossibleScore}
                    </p>
                    <p className="text-sm text-slate-600">
                      Akreditasi: {scoringResult.akreditasi}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
