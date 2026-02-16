import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import ResultModal from '../components/ResultModal';
import { FileText, Upload, Plus, Trash2, MapPin, Send, CheckCircle } from 'lucide-react';

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

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
                <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={getMenuForRole('asesor')} />
                <div className="flex-1 ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Memuat data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
            <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={getMenuForRole('asesor')} />

            <div className="flex-1 ml-64 overflow-auto">
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <header>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <MapPin className="w-8 h-8 text-amber-500" />
                            Pelaksanaan Asesmen Lapangan
                        </h1>
                        <p className="text-gray-600 mt-1">Submit Berita Acara dan temuan AL</p>
                    </header>

                    {/* Submission Info */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500">
                        <h2 className="text-xl font-bold text-gray-900">{submission?.programStudi || 'Program Studi'}</h2>
                        <p className="text-gray-600">{submission?.institusi || 'Institusi'}</p>
                        <div className="mt-3 flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800">
                                {submission?.status || 'N/A'}
                            </span>
                            <span className="text-sm text-gray-500 font-mono">{submissionId}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Berita Acara Upload */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-500" />
                                Dokumen Berita Acara
                            </h3>
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50 transition cursor-pointer"
                                onClick={() => document.getElementById('beritaAcaraInput').click()}
                            >
                                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 mb-1">
                                    {beritaAcaraFile ? beritaAcaraFile.name : 'Klik atau drag & drop file Berita Acara (PDF)'}
                                </p>
                                <p className="text-xs text-gray-400">Maks 10MB, format PDF</p>
                                <input 
                                    id="beritaAcaraInput"
                                    type="file" 
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => setBeritaAcaraFile(e.target.files[0])}
                                />
                            </div>
                            {beritaAcaraFile && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                                    <CheckCircle className="w-4 h-4" />
                                    File dipilih: {beritaAcaraFile.name}
                                </div>
                            )}
                        </div>

                        {/* Temuan */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-500" />
                                Temuan Asesmen
                            </h3>
                            <div className="space-y-3">
                                {findings.map((finding, index) => (
                                    <div key={index} className="flex gap-2">
                                        <span className="mt-2 text-sm font-semibold text-gray-500 min-w-[28px]">{index + 1}.</span>
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                                            placeholder={`Temuan ${index + 1}`}
                                            value={finding}
                                            onChange={(e) => handleFindingChange(index, e.target.value)}
                                        />
                                        {findings.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeFinding(index)} 
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button 
                                type="button" 
                                onClick={addFinding} 
                                className="mt-4 flex items-center gap-2 text-amber-600 font-semibold hover:text-amber-700 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Temuan
                            </button>
                        </div>

                        {/* Skor */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Konfirmasi Skor Akhir</h3>
                            <label className="block text-gray-600 mb-2 text-sm">Total Skor (Hasil AK + Revisi AL)</label>
                            <input 
                                type="number" 
                                className="border border-gray-300 p-3 rounded-xl w-full md:w-1/3 focus:ring-2 focus:ring-amber-500 outline-none transition"
                                value={totalScore}
                                onChange={(e) => setTotalScore(parseFloat(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                                max="400"
                            />
                        </div>

                        {/* Submit */}
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-3 bg-amber-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-amber-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                            {submitting ? 'Mengirim...' : 'Submit Berita Acara & Temuan'}
                        </button>
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
