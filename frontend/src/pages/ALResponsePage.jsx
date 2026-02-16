import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { FileText, Upload, MapPin, Send, CheckCircle, AlertTriangle } from 'lucide-react';

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

    useEffect(() => {
        const fetchData = async () => {
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

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={getMenuForRole('upps')} />
                <div className="flex-1 ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Memuat data...</p>
                    </div>
                </div>
            </div>
        );
    }

    const execution = alData?.alExecution;

    return (
        <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={getMenuForRole('upps')} />

            <div className="flex-1 ml-64 overflow-auto">
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <header>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <MapPin className="w-8 h-8 text-green-600" />
                            Tanggapan UPPS terhadap Temuan AL
                        </h1>
                        <p className="text-gray-600 mt-1">Berikan tanggapan terhadap temuan dari Asesor</p>
                    </header>

                    {/* Info Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
                        <h2 className="text-xl font-bold text-gray-900">{alData?.programStudi || 'Program Studi'}</h2>
                        <p className="text-gray-600">{alData?.institusi || 'Institusi'}</p>
                        <span className="mt-2 inline-block text-sm text-gray-500 font-mono">{submissionId}</span>
                    </div>

                    {!execution ? (
                        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Data AL</h3>
                            <p className="text-gray-500">Asesor belum mensubmit Berita Acara AL. Silakan tunggu hingga proses AL selesai.</p>
                        </div>
                    ) : (
                        <>
                            {/* Temuan Grid */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left: Temuan Asesor */}
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-amber-500" />
                                        Temuan Asesor
                                    </h3>
                                    {execution.findings && execution.findings.length > 0 ? (
                                        <ul className="space-y-3">
                                            {execution.findings.map((f, i) => (
                                                <li key={i} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                                                    <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-sm font-bold text-amber-800 flex-shrink-0">{i+1}</span>
                                                    <span className="text-gray-700">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 italic">Tidak ada temuan spesifik.</p>
                                    )}
                                </div>

                                {/* Right: Berita Acara Info */}
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-green-500" />
                                        Info Berita Acara
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500">Skor Total AL</p>
                                            <p className="text-2xl font-bold text-blue-600">{execution.total_score || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Tanggal Submit</p>
                                            <p className="font-semibold">{execution.submitted_at ? new Date(execution.submitted_at).toLocaleString('id-ID') : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Document CID</p>
                                            <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">{execution.berita_acara_cid || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Response Form */}
                            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Send className="w-5 h-5 text-green-500" />
                                    Form Tanggapan
                                </h3>

                                <div>
                                    <label className="block text-gray-700 mb-2 font-medium">Catatan / Tanggapan</label>
                                    <textarea
                                        className="border border-gray-300 p-3 rounded-xl w-full h-32 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                                        placeholder="Tuliskan tanggapan Anda terhadap temuan di atas..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-2 font-medium">Upload Dokumen Tanggapan (Opsional)</label>
                                    <div 
                                        className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center hover:border-green-400 hover:bg-green-50 transition cursor-pointer"
                                        onClick={() => document.getElementById('responseInput').click()}
                                    >
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-500">{responseFile ? responseFile.name : 'Klik untuk upload file PDF'}</p>
                                        <input
                                            id="responseInput"
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => setResponseFile(e.target.files[0])}
                                        />
                                    </div>
                                    {responseFile && (
                                        <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                                            <CheckCircle className="w-4 h-4" />
                                            {responseFile.name}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-3 bg-green-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-green-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5" />
                                    {submitting ? 'Mengirim...' : 'Kirim Tanggapan'}
                                </button>
                            </form>
                        </>
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
