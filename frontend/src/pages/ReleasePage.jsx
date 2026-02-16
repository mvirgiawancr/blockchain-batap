import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ReleasePage = () => {
    const { submissionId } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [certificateCid, setCertificateCid] = useState(null);

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const response = await api.get(`/submissions/${submissionId}`);
                if (response.data.data && response.data.data.accreditationDecision) {
                    setSubmission(response.data.data);
                    setCertificateCid(response.data.data.accreditationDecision.certificateCid);
                }
            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [submissionId]);

    const handlePreview = async () => {
        try {
            const response = await api.get(`/release/${submissionId}/preview-certificate`, {
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error previewing certificate:', error);
            alert('Failed to generate preview.');
        }
    };

    const handlePublish = async () => {
        if (!window.confirm('Are you sure you want to publish this certificate? This action is irreversible on the blockchain.')) return;
        
        setPublishing(true);
        try {
            const response = await api.post(`/release/${submissionId}/publish`, {});
            alert('Certificate Published Successfully!');
            setCertificateCid(response.data.data.certificateCid);
            // Reload submission
            const subRes = await api.get(`/submissions/${submissionId}`);
            setSubmission(subRes.data.data);
        } catch (error) {
            console.error('Error publishing:', error);
            alert('Failed to publish certificate.');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (!submission) return <div className="p-4">Submission or Decision not found.</div>;

    const decision = submission.accreditationDecision;

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 text-teal-800">Rilis Status & Sertifikat Akreditasi</h1>

            {/* Decision Certificate Card */}
            <div className="bg-white p-8 rounded shadow-lg border-t-8 border-teal-600 text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{decision.finalRank}</h2>
                <p className="text-gray-500 mb-4">Peringkat Akreditasi</p>
                
                <div className="grid grid-cols-2 gap-4 text-left max-w-lg mx-auto bg-gray-50 p-4 rounded mb-6">
                    <div>
                        <p className="text-xs text-gray-500">Program Studi</p>
                        <p className="font-semibold">{submission.programStudi}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Nomor SK</p>
                        <p className="font-semibold">{decision.skNumber}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Tanggal SK</p>
                        <p className="font-semibold">{new Date(decision.skDate).toLocaleDateString()}</p>
                    </div>
                     <div>
                        <p className="text-xs text-gray-500">Berlaku Sampai</p>
                        <p className="font-semibold">{new Date(decision.validUntil).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex justify-center gap-4">
                    <button 
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-6 py-2 border border-teal-600 text-teal-600 rounded hover:bg-teal-50 font-bold transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Preview Sertifikat
                    </button>

                    {!certificateCid ? (
                        <button 
                            onClick={handlePublish}
                            disabled={publishing}
                            className={`flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-bold shadow-lg transition ${publishing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            {publishing ? 'Publishing...' : 'Publish & Release'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-green-700 rounded border border-green-200">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                             Terbit (CID: {certificateCid.substring(0, 10)}...)
                        </div>
                    )}
                </div>
            </div>

            {/* External Systems Status */}
            <div className="bg-white p-6 rounded shadow opacity-70">
                <h3 className="text-lg font-bold mb-4 text-gray-500">Integrasi Sistem Eksternal (Mock)</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded bg-gray-50">
                        <span>PDDIKTI Sync</span>
                        <span className="text-yellow-600 text-sm font-mono">PENDING</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded bg-gray-50">
                        <span>BAN-PT Database</span>
                        <span className="text-yellow-600 text-sm font-mono">PENDING</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleasePage;
