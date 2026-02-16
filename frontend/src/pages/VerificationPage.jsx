import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    CheckCircle, FileText, Award, TrendingUp, Calendar, 
    AlertCircle, ArrowLeft, Save, Building, BookOpen 
} from 'lucide-react';
import api from '../services/api';

import SuccessModal from '../components/SuccessModal';

const VerificationPage = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Verification Form State
    const [notes, setNotes] = useState('');
    const [finalScore, setFinalScore] = useState(0);
    const [recommendedRank, setRecommendedRank] = useState('Baik');
    const [submitting, setSubmitting] = useState(false);

    // Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch AL details (findings, response, status)
                const alRes = await api.get(`/al-execution/${submissionId}`);
                const alData = alRes.data.data;
                
                // Fetch submission details (program name, institution)
                const subRes = await api.get(`/submissions/${submissionId}`);
                const subData = subRes.data.data;
                
                setSubmission({
                    ...alData,
                    programStudi: subData.programStudi,
                    institusi: subData.institusi
                });
                
                // Initialize form with existing data if available
                if (alData.alExecution) {
                    setFinalScore(alData.alExecution.total_score || 0);
                }
            } catch (error) {
                console.error('Error fetching details:', error);
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
            const payload = {
                notes,
                finalScore,
                recommendedRank,
                scoreAdjustments: [] 
            };
            await api.post(`/verification/${submissionId}/verify`, payload);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error verifying:', error);
            alert('Gagal menyimpan verifikasi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);
        navigate(`/verification`); // Back to list
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!submission) return (
        <div className="p-8 text-center bg-gray-50 min-h-screen">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Data Submission Tidak Ditemukan</h2>
            <button onClick={() => navigate('/verification')} className="mt-4 text-indigo-600 hover:underline">
                Kembali ke Daftar
            </button>
        </div>
    );

    const { alExecution, alResponse } = submission;

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
             <SuccessModal 
                isOpen={showSuccessModal}
                title="Verifikasi Berhasil"
                message="Hasil verifikasi telah disimpan. Status submission kini diperbarui menjadi Verified."
                onConfirm={handleSuccessConfirm}
                confirmText="Kembali ke Daftar"
            />

            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button 
                            onClick={() => navigate('/verification')}
                            className="flex items-center text-gray-500 hover:text-indigo-600 mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali ke Daftar
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-indigo-600" />
                            Verifikasi Hasil Asesmen
                        </h1>
                        <p className="text-gray-500 mt-1">Review hasil asesmen lapangan dan berikan rekomendasi keputusan.</p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" /> Program Studi
                                </p>
                                <h3 className="text-xl font-bold text-gray-900">{submission.programStudi || 'N/A'}</h3>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <Building className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                             <p className="text-sm font-medium text-gray-500 mb-1">Institusi</p>
                             <p className="text-gray-700 font-medium">{submission.institusi || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 font-medium mb-1">Skor Asesmen Lapangan</p>
                                <h3 className="text-4xl font-bold">{alExecution?.total_score || '0.00'}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <TrendingUp className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-indigo-100 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>Dibuat: {formatDate(alExecution?.submitted_at)}</span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* AL Execution Detail */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                    Temuan Asesor
                                </h3>
                            </div>
                            <div className="p-6">
                                {alExecution?.findings?.length > 0 ? (
                                    <ul className="space-y-3">
                                        {alExecution.findings.map((f, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-gray-700">{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic text-center py-4">Tidak ada temuan dicatat.</p>
                                )}
                            </div>
                        </div>

                         {/* UPPS Response */}
                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <MessageSquareIcon className="w-5 h-5 text-gray-500" />
                                    Tanggapan UPPS
                                </h3>
                                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                    {formatDate(alResponse?.respondedAt)}
                                </span>
                            </div>
                            <div className="p-6">
                                {alResponse ? (
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <p className="text-gray-700 leading-relaxed">{alResponse.notes}</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic text-center py-4">Belum ada tanggapan dari UPPS.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Verification Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 sticky top-6">
                            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-indigo-600" />
                                    Form Keputusan Verifikasi
                                </h3>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Skor Final
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg font-bold text-gray-800"
                                            value={finalScore}
                                            onChange={(e) => setFinalScore(parseFloat(e.target.value))}
                                            step="0.01"
                                            required
                                        />
                                        <div className="absolute right-4 top-3.5 text-gray-400 font-medium">Pts</div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Dapat disesuaikan jika ada revisi pasca-tanggapan.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rekomendasi Peringkat
                                    </label>
                                    <select 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                                        value={recommendedRank}
                                        onChange={(e) => setRecommendedRank(e.target.value)}
                                    >
                                        <option value="Unggul">Unggul</option>
                                        <option value="Baik Sekali">Baik Sekali</option>
                                        <option value="Baik">Baik</option>
                                        <option value="Tidak Terakreditasi">Tidak Terakreditasi</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Catatan Verifikasi
                                    </label>
                                    <textarea 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-32 resize-none"
                                        placeholder="Berikan catatan atau rekomendasi untuk Majelis Akreditasi..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        required
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Simpan Verifikasi
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Icon for specific section
const MessageSquareIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

export default VerificationPage;
