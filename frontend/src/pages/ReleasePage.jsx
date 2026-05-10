import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ReleasePage = () => {
    const { submissionId } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [certificateCid, setCertificateCid] = useState(null);
    const [gatewayUrl, setGatewayUrl] = useState(null);

    const IPFS_GATEWAY = 'https://ivory-fancy-junglefowl-107.mypinata.cloud/ipfs/';

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const response = await api.get(`/submissions/${submissionId}`);
                if (response.data.data && response.data.data.accreditationDecision) {
                    setSubmission(response.data.data);
                    const cid = response.data.data.accreditationDecision.certificateCid;
                    setCertificateCid(cid);
                    if (cid && !cid.startsWith('QmCertFallback')) {
                        setGatewayUrl(`${IPFS_GATEWAY}${cid}`);
                    }
                }
            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [submissionId]);

    const isFallbackCid = certificateCid && certificateCid.startsWith('QmCertFallback');

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
        const action = isFallbackCid ? 're-upload sertifikat ke IPFS' : 'publish sertifikat ke blockchain';
        if (!window.confirm(`Apakah Anda yakin ingin ${action}?`)) return;
        
        setPublishing(true);
        try {
            const response = await api.post(`/release/${submissionId}/publish`, {});
            const data = response.data.data;
            setCertificateCid(data.certificateCid);
            if (data.gatewayUrl) {
                setGatewayUrl(data.gatewayUrl);
            } else if (data.certificateCid && !data.certificateCid.startsWith('QmCertFallback')) {
                setGatewayUrl(`${IPFS_GATEWAY}${data.certificateCid}`);
            }
            alert('Sertifikat berhasil dipublish!');
            // Reload submission
            const subRes = await api.get(`/submissions/${submissionId}`);
            setSubmission(subRes.data.data);
        } catch (error) {
            console.error('Error publishing:', error);
            alert('Gagal publish sertifikat. Coba lagi nanti.');
        } finally {
            setPublishing(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
    );

    if (!submission) return (
        <div className="p-8 text-center bg-gray-50 min-h-screen">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Submission atau Keputusan tidak ditemukan</h2>
        </div>
    );

    const decision = submission.accreditationDecision;
    const hasRealCid = certificateCid && !isFallbackCid;

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 text-teal-800">Rilis Status & Sertifikat Akreditasi</h1>

            {/* Decision Certificate Card */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border-t-8 border-teal-600 text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{decision.finalRank}</h2>
                <p className="text-gray-500 mb-4">Peringkat Akreditasi</p>
                
                <div className="grid grid-cols-2 gap-4 text-left max-w-lg mx-auto bg-gray-50 p-4 rounded-xl mb-6">
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
                        <p className="font-semibold">{new Date(decision.skDate).toLocaleDateString('id-ID')}</p>
                    </div>
                     <div>
                        <p className="text-xs text-gray-500">Berlaku Sampai</p>
                        <p className="font-semibold">{new Date(decision.validUntil).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>

                {/* IPFS Status Banner */}
                {isFallbackCid && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-semibold text-amber-800">Upload IPFS Gagal</h3>
                                <p className="text-amber-700 text-sm mt-1">
                                    Sertifikat tersimpan di database lokal tetapi gagal di-upload ke IPFS.
                                    Klik tombol <strong>"Re-upload ke IPFS"</strong> untuk mencoba upload ulang.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {hasRealCid && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">✅</span>
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-800">Sertifikat Tersimpan di IPFS</h3>
                                <p className="text-green-600 text-xs font-mono mt-1 break-all">CID: {certificateCid}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-center gap-4 flex-wrap">
                    <button 
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-6 py-2.5 border-2 border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 font-bold transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Preview Sertifikat
                    </button>

                    {/* Download button - only if real CID exists */}
                    {hasRealCid && gatewayUrl && (
                        <a
                            href={gatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-lg transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Sertifikat
                        </a>
                    )}

                    {/* Publish / Re-upload button */}
                    {(!certificateCid || isFallbackCid) && (
                        <button 
                            onClick={handlePublish}
                            disabled={publishing}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition ${
                                isFallbackCid
                                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                            } ${publishing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            {publishing 
                                ? 'Uploading...' 
                                : isFallbackCid 
                                    ? 'Re-upload ke IPFS' 
                                    : 'Publish & Release'
                            }
                        </button>
                    )}

                    {/* Show published badge if real CID */}
                    {hasRealCid && (
                        <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-green-700 rounded-xl border border-green-200">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                             Sertifikat Terbit
                        </div>
                    )}
                </div>
            </div>

            {/* External Systems Status */}
            <div className="bg-white p-6 rounded-2xl shadow opacity-70">
                <h3 className="text-lg font-bold mb-4 text-gray-500">Integrasi Sistem Eksternal (Mock)</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-xl bg-gray-50">
                        <span>PDDIKTI Sync</span>
                        <span className="text-yellow-600 text-sm font-mono">PENDING</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-xl bg-gray-50">
                        <span>BAN-PT Database</span>
                        <span className="text-yellow-600 text-sm font-mono">PENDING</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleasePage;
