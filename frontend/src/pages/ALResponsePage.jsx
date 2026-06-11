import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { 
  FileText, Upload, MapPin, Send, CheckCircle, 
  AlertTriangle, ArrowLeft, RefreshCw, Hash, Calendar, Layers, Info
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const ALResponsePage = ({ user }) => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alData, setAlData] = useState(null);
    const [notes, setNotes] = useState('');
    const [responseFile, setResponseFile] = useState(null);
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/al-execution/${submissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAlData(data.data);
            }
        } catch (error) {
            console.error('Error fetching AL details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [submissionId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                responseCid: responseFile ? `QmResp-${Date.now()}` : `QmResp-${submissionId.substring(0,8)}`,
                responseHash: `0xResp${Date.now().toString(16)}`,
                notes
            };

            const res = await fetch(`${API_BASE_URL}/al-execution/${submissionId}/response`, {
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
                    title: 'Tanggapan Terkirim! 🎉',
                    message: 'Tanggapan UPPS terhadap temuan AL berhasil dikirim.'
                });
            } else {
                const errData = await res.json();
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Gagal Mengirim',
                    message: errData.message || 'Terjadi kesalahan saat mengirim tanggapan.'
                });
            }
        } catch (error) {
            console.error('Error submitting response:', error);
            setResultModal({
                isOpen: true,
                type: 'error',
                title: 'Kesalahan Koneksi',
                message: 'Tidak dapat terhubung ke server.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const role = user?.role || 'upps';
    const menuItems = getMenuForRole(role);

    if (loading) {
        return (
            <div className="flex h-screen bg-slate-50 overflow-hidden relative">
                <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={menuItems} />
                <div className="flex-1 ml-64 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-semibold">Memuat data temuan AL...</p>
                </div>
            </div>
        );
    }

    const execution = alData?.alExecution;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-64 w-72 h-72 bg-indigo-100/15 rounded-full blur-3xl pointer-events-none" />

            <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={menuItems} />

            <div className="flex-1 ml-64 overflow-auto relative">
                <div className="p-8 max-w-5xl mx-auto">
                    
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/status')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-650 transition-colors mb-5 cursor-pointer group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Kembali ke Status Akreditasiku
                    </button>

                    {/* Page Title */}
                    <header className="flex items-start justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <MapPin className="w-8 h-8 text-emerald-600" />
                                Tanggapan UPPS terhadap Temuan AL
                            </h1>
                            <p className="text-slate-500 text-sm font-semibold mt-1">
                                Berikan tanggapan resmi dan justifikasi perbaikan program studi atas temuan lapangan Asesor
                            </p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </header>

                    {/* Target Information Card */}
                    <div className="bg-gradient-to-tr from-emerald-650 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-100/30 relative overflow-hidden mb-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
                        
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider mb-2.5">
                                    Program Studi Evaluasi
                                </span>
                                <h2 className="text-2xl font-black tracking-tight">{alData?.programStudi || 'Program Studi'}</h2>
                                <p className="text-emerald-100 font-bold text-sm mt-1">{alData?.institusi || 'Institusi'}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right min-w-[200px]">
                                <p className="text-[10px] text-emerald-250 font-black uppercase tracking-wider mb-1">ID Submission</p>
                                <p className="font-mono text-xs font-bold text-white tracking-wide break-all">{submissionId}</p>
                            </div>
                        </div>
                    </div>

                    {!execution ? (
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm max-w-2xl mx-auto my-6 animate-fade-in">
                            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
                            <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Data Asesmen</h3>
                            <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                                Asesor belum mengunggah dokumen Berita Acara AL. Silakan tunggu hingga Asesor menyelesaikan input hasil asesmen lapangan.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Temuan Grid */}
                            <div className="grid md:grid-cols-5 gap-6">
                                
                                {/* Left: Temuan Asesor (Span 3) */}
                                <div className="md:col-span-3 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col">
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-amber-605" />
                                        </div>
                                        <h3 className="text-base font-black text-slate-800">Temuan Asesor</h3>
                                    </div>
                                    
                                    {execution.findings && execution.findings.length > 0 ? (
                                        <div className="space-y-3 flex-1 overflow-auto max-h-[350px] pr-1">
                                            {execution.findings.map((f, i) => (
                                                <div key={i} className="flex gap-3 p-4 bg-amber-55/10 hover:bg-amber-55/20 border border-amber-200/40 rounded-2xl transition duration-150 items-start">
                                                    <span className="w-6 h-6 bg-amber-500/20 rounded-xl flex items-center justify-center text-xs font-black text-amber-800 flex-shrink-0 font-mono shadow-inner mt-0.5">
                                                        {i+1}
                                                    </span>
                                                    <span className="text-slate-700 text-sm font-semibold leading-relaxed">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic text-xs font-semibold py-8 text-center">Tidak ada temuan spesifik yang dicatat oleh asesor.</p>
                                    )}
                                </div>

                                {/* Right: Berita Acara Info (Span 2) */}
                                <div className="md:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <h3 className="text-base font-black text-slate-800">Detail Berita Acara</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Skor Total AL</p>
                                            <p className="text-3xl font-black text-indigo-700 mt-1">{Number(execution.total_score || 0).toFixed(2)}</p>
                                        </div>
                                        
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Tanggal Submit</p>
                                            <p className="text-sm font-bold text-slate-750">
                                                {execution.submitted_at ? new Date(execution.submitted_at).toLocaleString('id-ID', {
                                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Document CID (IPFS)</p>
                                            <p className="font-mono text-xs break-all bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600">
                                                {execution.berita_acara_cid || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Response / Read-only Tanggapan */}
                            {alData.alResponse ? (
                                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 space-y-6 shadow-sm animate-fade-in">
                                    <div className="flex items-center gap-2.5 mb-2 border-b border-slate-100 pb-4">
                                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-800">Tanggapan UPPS Telah Dikirim</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Catatan di Ledger Blockchain AkreChain</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Catatan / Justifikasi UPPS</span>
                                            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-700 text-sm font-semibold leading-relaxed">
                                                {alData.alResponse.notes || 'Tidak ada catatan tanggapan spesifik.'}
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Tanggal Respon</span>
                                                <span className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-lg inline-block">
                                                    {new Date(alData.alResponse.submitted_at || alData.alResponse.created_at || Date.now()).toLocaleString('id-ID', {
                                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Response CID (IPFS)</span>
                                                <span className="text-xs font-mono text-slate-655 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-lg inline-block break-all">
                                                    {alData.alResponse.response_cid || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {alData.alResponse.response_cid && (
                                            <div className="pt-2">
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Dokumen Lampiran</span>
                                                <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800 w-fit">
                                                    <FileText className="w-4 h-4 text-emerald-600" />
                                                    <span>Bukti_Tanggapan_{submissionId.substring(0, 8)}.pdf</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 space-y-6 shadow-sm">
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <Send className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <h3 className="text-base font-black text-slate-800">Form Tanggapan UPPS</h3>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                                            Catatan Tanggapan Terhadap Temuan <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                            placeholder="Tuliskan justifikasi, perbaikan, atau tanggapan resmi institusi Anda terhadap temuan Asesor di atas..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={4}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                                            Lampiran Dokumen Bukti Perbaikan (PDF, Opsional)
                                        </label>
                                        <div 
                                            className="border-2 border-dashed border-emerald-250 hover:border-emerald-500 rounded-2xl p-6 bg-emerald-50/10 hover:bg-emerald-50/20 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center group"
                                            onClick={() => document.getElementById('responseInput').click()}
                                        >
                                            <Upload className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 transition-colors mb-3 shadow-inner" />
                                            <p className="text-xs font-black text-slate-850 group-hover:text-emerald-600 transition-colors">
                                                {responseFile ? responseFile.name : 'Klik untuk mengunggah file bukti perbaikan'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-1">Mendukung file PDF hingga maksimal 10MB</p>
                                            <input
                                                id="responseInput"
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={(e) => setResponseFile(e.target.files[0])}
                                            />
                                        </div>
                                        
                                        {responseFile && (
                                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-2.5 animate-fade-in">
                                                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                <span className="text-xs font-bold text-emerald-850 truncate flex-1">{responseFile.name}</span>
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider px-2 py-0.5 bg-white border border-emerald-100 rounded-full">Ready</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-sm font-black uppercase tracking-wider cursor-pointer shadow-md shadow-emerald-100/30 active:scale-95 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Mengirim Tanggapan...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Kirim Tanggapan Resmi
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ResultModal
                isOpen={resultModal.isOpen}
                onClose={() => {
                    setResultModal({ ...resultModal, isOpen: false });
                    if (resultModal.type === 'success') {
                        navigate('/status');
                    }
                }}
                type={resultModal.type}
                title={resultModal.title}
                message={resultModal.message}
            />
        </div>
    );
};

export default ALResponsePage;
