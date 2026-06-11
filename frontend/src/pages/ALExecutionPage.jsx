import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { 
  FileText, Upload, Plus, Trash2, MapPin, Send, CheckCircle, 
  ArrowLeft, RefreshCw, AlertCircle, Hash, Building2, BookOpen, Layers
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const ALExecutionPage = ({ user }) => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [findings, setFindings] = useState(['']);
    const [totalScore, setTotalScore] = useState(0);
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [beritaAcaraFile, setBeritaAcaraFile] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                // Get submission details
                const subRes = await fetch(`${API_BASE_URL}/submissions/${submissionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (subRes.ok) {
                    const subData = await subRes.json();
                    const sub = subData.data || subData;
                    setSubmission(sub);
                    if (sub.scoringResult?.totalScore) {
                        setTotalScore(sub.scoringResult.totalScore);
                    } else if (sub.ai?.scoring?.finalScore) {
                        setTotalScore(sub.ai.scoring.finalScore);
                    }
                }

                // Check if AL execution already exists
                const execRes = await fetch(`${API_BASE_URL}/al-execution/${submissionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (execRes.ok) {
                    const execData = await execRes.json();
                    if (execData.data?.alExecution) {
                        const exec = execData.data.alExecution;
                        setFindings(exec.findings?.length > 0 ? exec.findings : ['']);
                        setTotalScore(exec.total_score || totalScore);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [submissionId]);

    const handleFindingChange = (index, value) => {
        const newFindings = [...findings];
        newFindings[index] = value;
        setFindings(newFindings);
    };

    const addFinding = () => setFindings([...findings, '']);
    const removeFinding = (index) => {
        if (findings.length > 1) {
            setFindings(findings.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                beritaAcaraCid: beritaAcaraFile ? `QmBA-${Date.now()}` : `QmBA-${submissionId.substring(0,8)}`,
                beritaAcaraHash: `0xBA${Date.now().toString(16)}`,
                findings: findings.filter(f => f.trim()),
                scores: submission?.scoringResult?.scores || {},
                totalScore,
                attendanceValues: { asesor1: true, asesor2: true, upps: true }
            };

            const res = await fetch(`${API_BASE_URL}/al-execution/${submissionId}/execution`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Berita Acara Disubmit! 🎉',
                    message: 'Berita Acara dan temuan AL berhasil disubmit. UPPS akan menerima notifikasi untuk merespon temuan Anda.'
                });
            } else {
                const errData = await res.json();
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Gagal Submit',
                    message: errData.message || 'Terjadi kesalahan saat mensubmit Berita Acara.'
                });
            }
        } catch (error) {
            console.error('Error submitting:', error);
            setResultModal({
                isOpen: true,
                type: 'error',
                title: 'Kesalahan Koneksi',
                message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const role = user?.role || 'asesor';
    const menuItems = getMenuForRole(role);

    if (loading) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden relative">
                <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={menuItems} />
                <div className="flex-1 ml-64 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-amber-250 border-t-amber-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-semibold">Memuat data pelaksanaan AL...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-64 w-72 h-72 bg-orange-100/10 rounded-full blur-3xl pointer-events-none" />

            <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={menuItems} />

            <div className="flex-1 ml-64 overflow-auto relative">
                <div className="p-8 max-w-4xl mx-auto">
                    
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/asesor/assignments')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors mb-5 cursor-pointer group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Kembali ke Penugasan Saya
                    </button>

                    {/* Page Title */}
                    <header className="flex items-start justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <MapPin className="w-8 h-8 text-amber-500" />
                                Pelaksanaan Asesmen Lapangan (AL)
                            </h1>
                            <p className="text-slate-500 text-sm font-semibold mt-1">
                                Kelola pengunggahan Berita Acara, komparasi temuan lapangan, dan konfirmasi penilaian akhir
                            </p>
                        </div>
                    </header>

                    {/* Submission Target Box */}
                    <div className="bg-gradient-to-tr from-amber-500 to-amber-650 rounded-2xl p-6 text-white shadow-lg shadow-amber-100/30 relative overflow-hidden mb-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
                        
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider mb-2.5">
                                    Target Evaluasi Lapangan
                                </span>
                                <h2 className="text-2xl font-black tracking-tight">{submission?.programStudi || submission?.program_name}</h2>
                                <p className="text-amber-100 font-bold text-sm mt-1">{submission?.institusi || submission?.institution_name}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right min-w-[200px]">
                                <p className="text-[10px] text-amber-200 font-black uppercase tracking-wider mb-1">ID Submission</p>
                                <p className="font-mono text-xs font-bold text-white tracking-wide break-all">{submissionId}</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Berita Acara Upload */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-amber-600" />
                                </div>
                                <h3 className="text-base font-black text-slate-800">Dokumen Berita Acara</h3>
                            </div>
                            <p className="text-slate-500 text-xs font-semibold mb-5">
                                Unggah dokumen Berita Acara (BA) hasil kesepakatan asesmen lapangan dalam format PDF
                            </p>

                            <div 
                                className="border-2 border-dashed border-amber-200 hover:border-amber-500 rounded-2xl p-8 text-center bg-amber-50/10 hover:bg-amber-50/20 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center group"
                                onClick={() => document.getElementById('beritaAcaraInput').click()}
                            >
                                <div className="w-12 h-12 rounded-full bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors mb-3 shadow-inner">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                                    {beritaAcaraFile ? beritaAcaraFile.name : 'Pilih file atau seret Berita Acara Anda di sini'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">Mendukung file PDF hingga maksimal 10MB</p>
                                <input 
                                    id="beritaAcaraInput"
                                    type="file" 
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => setBeritaAcaraFile(e.target.files[0])}
                                />
                            </div>

                            {beritaAcaraFile && (
                                <div className="mt-4.5 p-3 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-2.5 animate-fade-in">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span className="text-xs font-bold text-emerald-800 truncate flex-1">{beritaAcaraFile.name}</span>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider px-2 py-0.5 bg-white border border-emerald-100 rounded-full">Selected</span>
                                </div>
                            )}
                        </div>

                        {/* Temuan Asesmen */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                </div>
                                <h3 className="text-base font-black text-slate-800">Temuan Asesmen Lapangan</h3>
                            </div>
                            <p className="text-slate-500 text-xs font-semibold mb-5">
                                Masukkan rincian temuan atau butir observasi lapangan yang wajib direspon oleh pihak UPPS
                            </p>

                            <div className="space-y-3.5">
                                {findings.map((finding, index) => (
                                    <div key={index} className="flex gap-2.5 items-center animate-fade-in">
                                        <span className="text-xs font-black text-slate-400 min-w-[28px] bg-slate-50 border border-slate-200 rounded-lg p-2 text-center shadow-inner font-mono">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-slate-200 p-3 bg-white rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition duration-150"
                                            placeholder={`Tuliskan deskripsi temuan ${index + 1}...`}
                                            value={finding}
                                            onChange={(e) => handleFindingChange(index, e.target.value)}
                                            required
                                        />
                                        {findings.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeFinding(index)} 
                                                className="p-3 text-rose-500 hover:text-rose-700 bg-rose-50 border border-rose-100 rounded-xl transition duration-150 active:scale-95 flex-shrink-0 cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button 
                                type="button" 
                                onClick={addFinding} 
                                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-700 hover:text-amber-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Temuan Baru
                            </button>
                        </div>

                        {/* Konfirmasi Skor */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-amber-600" />
                                </div>
                                <h3 className="text-base font-black text-slate-800">Konfirmasi Skor Akhir</h3>
                            </div>
                            <p className="text-slate-500 text-xs font-semibold mb-5">
                                Nilai total skor hasil asesmen kecukupan yang diselaraskan dengan verifikasi lapangan (skala 0 - 4.00)
                            </p>

                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 w-full md:w-fit min-w-[280px]">
                                <input 
                                    type="number" 
                                    className="border border-slate-200 p-2.5 rounded-xl w-24 text-center font-black text-xl text-amber-700 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition duration-150"
                                    value={totalScore}
                                    onChange={(e) => setTotalScore(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                    max="4"
                                    required
                                />
                                <span className="text-sm font-black text-slate-400">/ 4.00 (Skala Terbobot)</span>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-tr from-amber-500 to-amber-650 hover:from-amber-650 hover:to-amber-750 text-white rounded-xl text-sm font-black uppercase tracking-wider cursor-pointer shadow-md shadow-amber-100/30 active:scale-95 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Berita Acara & Temuan
                                    </>
                                )}
                            </button>

                            {/* Warning */}
                            <div className="mt-4.5 p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-xs text-amber-850 font-semibold leading-relaxed">
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p>
                                    <span className="font-black">PENTING:</span> Penyerahan Berita Acara dan Temuan AL akan direkam secara permanen di ledger blockchain AkreChain. Pastikan berkas PDF BA dan keselarasan skor sudah sesuai kesepakatan penutupan AL.
                                </p>
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            <ResultModal
                isOpen={resultModal.isOpen}
                onClose={() => {
                    setResultModal({ ...resultModal, isOpen: false });
                    if (resultModal.type === 'success') {
                        navigate('/asesor/assignments');
                    }
                }}
                type={resultModal.type}
                title={resultModal.title}
                message={resultModal.message}
            />
        </div>
    );
};

export default ALExecutionPage;
