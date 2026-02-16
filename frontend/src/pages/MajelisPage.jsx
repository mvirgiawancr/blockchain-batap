import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SuccessModal from '../components/SuccessModal';

const MajelisPage = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Decision Form
    const [finalRank, setFinalRank] = useState('Unggul');
    const [finalScore, setFinalScore] = useState(0);
    const [skNumber, setSkNumber] = useState('');
    const [skDate, setSkDate] = useState(new Date().toISOString().split('T')[0]);
    const [validUntil, setValidUntil] = useState('');

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const response = await api.get(`/submissions/${submissionId}`);
                const data = response.data.data;
                setSubmission(data);
                
                if (data.verificationResult) {
                    setFinalScore(data.verificationResult.finalScore);
                    setFinalRank(data.verificationResult.recommendedRank);
                }

                // Default validUntil = +5 years
                const today = new Date();
                const next5Years = new Date(today.setFullYear(today.getFullYear() + 5));
                setValidUntil(next5Years.toISOString().split('T')[0]);

            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [submissionId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                finalRank,
                finalScore,
                skNumber,
                skDate,
                validUntil
            };
            await api.post(`/verification/${submissionId}/finalize`, payload);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error finalizing:', error);
            alert('Failed to finalize decision.');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-800"></div>
        </div>
    );

    if (!submission) return (
        <div className="p-8 text-center bg-gray-50 min-h-screen">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Data Submission Tidak Ditemukan</h2>
            <button onClick={() => navigate('/majelis')} className="mt-4 text-purple-800 hover:underline font-medium">
                Kembali ke Dashboard Majelis
            </button>
        </div>
    );

    if (!submission.verificationResult) return (
        <div className="p-8 text-center bg-gray-50 min-h-screen">
             <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Belum Ada Hasil Verifikasi</h2>
            <p className="text-gray-500 mt-2">Submission ini belum diverifikasi oleh Sekretariat/KEA. Mohon tunggu proses verifikasi selesai.</p>
            <button onClick={() => navigate('/majelis')} className="mt-4 text-purple-800 hover:underline font-medium">
                Kembali ke Dashboard Majelis
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
             <SuccessModal 
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    navigate(`/release/${submissionId}`);
                }}
                title="Keputusan Final Ditetapkan!"
                message="SK Akreditasi berhasil digenerate dan data telah disimpan ke blockchain secara permanen."
                buttonText="Lanjut ke Rilis SK"
            />
            <div className="max-w-4xl mx-auto">
            {/* ... rest of the component */}
                <button 
                    onClick={() => navigate('/majelis')}
                    className="flex items-center text-gray-500 hover:text-purple-800 mb-4 transition-colors"
                >
                    <span className="mr-2">←</span>
                    Kembali ke Dashboard
                </button>

                <h1 className="text-3xl font-bold mb-2 text-purple-900">Penetapan Keputusan Akreditasi</h1>
                <p className="text-gray-500 mb-8">Review hasil verifikasi dan terbitkan SK Akreditasi final.</p>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column: Verification Summary */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-l-4 border-l-purple-600">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Hasil Verifikasi</h2>
                            
                            <div className="mb-4">
                                <p className="text-xs text-gray-400">Rekomendasi Peringkat</p>
                                <p className="text-xl font-bold text-purple-800">{submission.verificationResult.recommendedRank}</p>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-xs text-gray-400">Skor Terverifikasi</p>
                                <p className="text-2xl font-bold text-gray-900">{submission.verificationResult.finalScore}</p>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">Catatan Verifikator</p>
                                <p className="text-sm text-gray-600 italic">"{submission.verificationResult.notes || '-'}"</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <h3 className="font-bold text-gray-800 text-lg mb-1">{submission.programStudi}</h3>
                             <p className="text-purple-600 font-medium mb-4">{submission.institusi}</p>
                             
                             <div className="space-y-3 text-sm text-gray-600 border-t border-gray-100 pt-4">
                                <div>
                                    <p className="text-xs text-gray-400">Jenjang Program</p>
                                    <p className="font-medium text-gray-800">{submission.programType}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Status Saat Ini</p>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                        {submission.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Diajukan Tanggal</p>
                                    <p>{new Date(submission.submittedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                {submission.address && (
                                    <div>
                                        <p className="text-xs text-gray-400">Alamat Kampus</p>
                                        <p>{submission.address}</p>
                                    </div>
                                )}
                                {submission.contactPerson && (
                                    <div>
                                        <p className="text-xs text-gray-400">Kontak Person</p>
                                        <p>{submission.contactPerson}</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    {/* Right Column: Decision Form */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span>⚖️</span> Form Keputusan Final
                            </h3>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Peringkat Akreditasi</label>
                                    <select 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                                        value={finalRank}
                                        onChange={(e) => setFinalRank(e.target.value)}
                                    >
                                        <option value="Unggul">Unggul</option>
                                        <option value="Baik Sekali">Baik Sekali</option>
                                        <option value="Baik">Baik</option>
                                        <option value="Tidak Terakreditasi">Tidak Terakreditasi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Skor Akhir</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                        value={finalScore}
                                        onChange={(e) => setFinalScore(parseFloat(e.target.value))}
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nomor SK</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono text-sm"
                                        placeholder="No. SK Akreditasi (Auto-generated if empty)"
                                        value={skNumber}
                                        onChange={(e) => setSkNumber(e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal SK</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            value={skDate}
                                            onChange={(e) => setSkDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Berlaku Sampai</label>
                                        <input 
                                            type="date" 
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            value={validUntil}
                                            onChange={(e) => setValidUntil(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => navigate('/majelis')} 
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-2 w-full px-6 py-3 bg-purple-800 text-white font-bold rounded-xl hover:bg-purple-900 transition-all shadow-lg shadow-purple-200"
                                >
                                    Tetapkan Keputusan & Generate SK
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MajelisPage;
