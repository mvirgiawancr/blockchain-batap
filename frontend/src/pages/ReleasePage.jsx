import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Award, ShieldCheck, FileText, Download, UploadCloud, RefreshCw, 
  CheckCircle, AlertTriangle, ArrowLeft, ExternalLink, Calendar, 
  Building2, Server, Globe, Check, Copy, Clock
} from 'lucide-react';

const ReleasePage = ({ user }) => {
    const navigate = useNavigate();
    const { submissionId } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [certificateCid, setCertificateCid] = useState(null);
    const [gatewayUrl, setGatewayUrl] = useState(null);
    const [copied, setCopied] = useState(false);
    
    // External mock sync states
    const [pddiktiSynced, setPddiktiSynced] = useState(false);
    const [banptSynced, setBanptSynced] = useState(false);
    const [syncingPddikti, setSyncingPddikti] = useState(false);
    const [syncingBanpt, setSyncingBanpt] = useState(false);

    // Custom premium modal configuration
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'confirm', // 'confirm' | 'success' | 'error' | 'warning'
        title: '',
        message: '',
        onConfirm: null
    });

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
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error previewing certificate:', error);
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Gagal Membuka Preview',
                message: 'Tidak dapat membuat atau membuka draft pratinjau sertifikat saat ini.',
                onConfirm: null
            });
        }
    };

    const handlePublish = () => {
        const actionText = isFallbackCid ? 'melakukan re-upload sertifikat ke IPFS' : 'menerbitkan & mempublikasikan sertifikat akreditasi ke blockchain AkreChain secara resmi';
        
        setModalConfig({
            show: true,
            type: 'confirm',
            title: isFallbackCid ? 'Re-upload ke IPFS' : 'Terbitkan Sertifikat',
            message: `Apakah Anda yakin ingin ${actionText}? Tindakan ini bersifat permanen dan imutabel pada ledger blockchain.`,
            onConfirm: executePublish
        });
    };

    const executePublish = async () => {
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
            
            // Reload submission
            const subRes = await api.get(`/submissions/${submissionId}`);
            setSubmission(subRes.data.data);

            setModalConfig({
                show: true,
                type: 'success',
                title: 'Sertifikat Berhasil Dirilis',
                message: 'Selamat! Sertifikat akreditasi resmi telah sukses ditandatangani secara kriptografis dan diterbitkan ke blockchain & IPFS secara imutabel.',
                onConfirm: null
            });
        } catch (error) {
            console.error('Error publishing:', error);
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Gagal Merilis Sertifikat',
                message: error.response?.data?.message || 'Terjadi kesalahan sistem saat mencoba menerbitkan sertifikat ke blockchain. Silakan coba kembali nanti.',
                onConfirm: null
            });
        } finally {
            setPublishing(false);
        }
    };

    const handleSyncPddikti = () => {
        if (!hasRealCid) {
            setModalConfig({
                show: true,
                type: 'warning',
                title: 'Aksi Ditangguhkan',
                message: 'Sertifikat resmi harus diterbitkan ke blockchain terlebih dahulu sebelum disinkronisasikan ke Pangkalan Data Pendidikan Tinggi (PDDIKTI)!',
                onConfirm: null
            });
            return;
        }
        setSyncingPddikti(true);
        setTimeout(() => {
            setSyncingPddikti(false);
            setPddiktiSynced(true);
            setModalConfig({
                show: true,
                type: 'success',
                title: 'Sinkronisasi PDDIKTI Sukses',
                message: 'Data status akreditasi resmi program studi telah sukses disinkronisasikan secara real-time dengan Pangkalan Data Pendidikan Tinggi (PDDIKTI).',
                onConfirm: null
            });
        }, 1500);
    };

    const handleSyncBanpt = () => {
        if (!hasRealCid) {
            setModalConfig({
                show: true,
                type: 'warning',
                title: 'Aksi Ditangguhkan',
                message: 'Sertifikat resmi harus diterbitkan ke blockchain terlebih dahulu sebelum disinkronisasikan ke Direktori Nasional BAN-PT!',
                onConfirm: null
            });
            return;
        }
        setSyncingBanpt(true);
        setTimeout(() => {
            setSyncingBanpt(false);
            setBanptSynced(true);
            setModalConfig({
                show: true,
                type: 'success',
                title: 'Sinkronisasi BAN-PT Sukses',
                message: 'Sertifikat akreditasi telah sukses terintegrasi dengan direktori database sertifikasi nasional BAN-PT.',
                onConfirm: null
            });
        }, 1500);
    };

    const copyToClipboard = () => {
        if (!certificateCid) return;
        navigator.clipboard.writeText(certificateCid);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={getMenuForRole(user?.role || 'sekretariat')} />
            <div className="flex-1 ml-64 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm font-semibold">Memuat rilis sertifikat...</p>
            </div>
        </div>
    );

    if (!submission) return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            <Sidebar user={user} onLogout={() => navigate('/login')} menuItems={getMenuForRole(user?.role || 'sekretariat')} />
            <div className="flex-1 ml-64 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 mb-4 text-rose-550">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-800">Submission tidak ditemukan</h2>
                <p className="text-slate-500 text-sm font-semibold mt-1">Berkas penetapan akreditasi tidak tersedia.</p>
            </div>
        </div>
    );

    const decision = submission.accreditationDecision;
    const hasRealCid = certificateCid && !isFallbackCid;
    const isUpps = user?.role === 'upps';

    // Premium styling variables for rank
    const getRankStyle = (rank) => {
        const r = rank?.toLowerCase() || '';
        if (r.includes('unggul')) return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-250', glow: 'from-emerald-500 to-teal-500' };
        if (r.includes('sekali')) return { bg: 'bg-blue-50 text-blue-800 border-blue-250', glow: 'from-blue-500 to-indigo-500' };
        if (r.includes('baik')) return { bg: 'bg-indigo-50 text-indigo-800 border-indigo-250', glow: 'from-indigo-400 to-purple-500' };
        return { bg: 'bg-rose-50 text-rose-800 border-rose-250', glow: 'from-rose-500 to-red-500' };
    };

    const rankStyle = getRankStyle(decision.finalRank);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Ambient background glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-200/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-64 w-[600px] h-[600px] bg-purple-200/5 rounded-full blur-[150px] pointer-events-none" />

            <Sidebar
                user={user}
                onLogout={() => navigate('/login')}
                menuItems={getMenuForRole(user?.role || 'sekretariat')}
            />

            <div className="flex-1 ml-64 overflow-auto relative">
                <div className="p-8 max-w-4xl mx-auto space-y-6">
                    
                    {/* Back navigation */}
                    {(user?.role === 'sekretariat' || user?.role === 'admin') && (
                        <button 
                            onClick={() => navigate('/release')}
                            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-xs uppercase tracking-wider transition-all duration-200 group cursor-pointer bg-transparent border-0 outline-none mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
                            Kembali ke Daftar Rilis
                        </button>
                    )}
                    {user?.role === 'majelis' && (
                        <button 
                            onClick={() => navigate('/majelis/decisions')}
                            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-xs uppercase tracking-wider transition-all duration-200 group cursor-pointer bg-transparent border-0 outline-none mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
                            Kembali ke Keputusan Akreditasi
                        </button>
                    )}

                    {/* Header */}
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100/50">
                                    <Award className="w-5.5 h-5.5" />
                                </div>
                                Rilis Status & Sertifikat Akreditasi
                            </h1>
                            <p className="text-slate-500 text-sm font-semibold mt-1">
                                {isUpps 
                                    ? 'Pantau penerbitan sertifikat resmi Anda yang diamankan di blockchain AkreChain'
                                    : 'Terbitkan secara resmi sertifikat akreditasi program studi ke blockchain dan IPFS'
                                }
                            </p>
                        </div>
                    </header>

                    {/* Main Certificate Card (Glassmorphic) */}
                    <div className="glass-panel-light rounded-3xl border border-slate-200/60 overflow-hidden shadow-md relative group">
                        {/* Top Gradient Glow Accent */}
                        <div className={`h-2.5 w-full bg-gradient-to-r ${rankStyle.glow}`} />

                        <div className="p-8 text-center space-y-6 relative z-10">
                            {/* Visual Seal badge */}
                            <div className="mx-auto w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                <Award className="w-10 h-10" />
                            </div>

                            <div>
                                <span className={`px-4.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm ${rankStyle.bg}`}>
                                    {decision.finalRank}
                                </span>
                                <h2 className="text-2xl font-black text-slate-900 mt-4 tracking-tight">Peringkat Akreditasi Resmi</h2>
                            </div>

                            {/* SK Metadata details inside custom grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 text-left max-w-xl mx-auto bg-slate-50/70 border border-slate-200/60 p-5 rounded-2xl shadow-inner-sm">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                        Program Studi
                                    </p>
                                    <p className="text-sm font-black text-slate-800 leading-snug">{submission.programStudi || 'N/A'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                        Nomor SK Akreditasi
                                    </p>
                                    <p className="text-sm font-black text-slate-700 font-mono">{decision.skNumber || 'N/A'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        Tanggal Ditetapkan (SK)
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {decision.skDate ? new Date(decision.skDate).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        }) : '-'}
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        Berlaku Sampai
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {decision.validUntil ? new Date(decision.validUntil).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        }) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* IPFS Status Banners */}
                            {isFallbackCid && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left max-w-xl mx-auto flex items-start gap-3.5 shadow-sm">
                                    <AlertTriangle className="w-5.5 h-5.5 text-amber-550 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">Upload IPFS Bermasalah</h3>
                                        <p className="text-amber-700 text-xs font-semibold leading-relaxed mt-1">
                                            Sertifikat tersimpan di database lokal tetapi belum sinkron ke IPFS desentralisasi.
                                            {isUpps 
                                                ? ' Silakan hubungi Sekretariat LAM-TEK untuk memproses sinkronisasi ulang.'
                                                : ' Klik tombol "Re-upload ke IPFS" di bawah untuk mencoba upload ulang.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {hasRealCid && (
                                <div className="bg-emerald-50/40 border border-emerald-150 rounded-2xl p-4 text-left max-w-xl mx-auto space-y-2 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Sertifikat Terbit di IPFS (AkreChain Ledger)</h3>
                                            <div className="flex items-center gap-1.5 bg-white border border-emerald-100 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800 shadow-sm mt-1.5 w-fit max-w-full">
                                                <span className="truncate">{certificateCid}</span>
                                                <button 
                                                    onClick={copyToClipboard}
                                                    className="text-emerald-450 hover:text-emerald-700 bg-transparent border-0 cursor-pointer p-0.5 flex-shrink-0"
                                                    title="Copy CID"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Buttons and Action row */}
                            <div className="flex justify-center gap-3.5 flex-wrap pt-3 border-t border-slate-100">
                                <button 
                                    onClick={handlePreview}
                                    className="flex items-center gap-2 px-5 py-3 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    Preview Sertifikat
                                </button>

                                {/* Download button - only if real CID exists */}
                                {hasRealCid && gatewayUrl && (
                                    <a
                                        href={gatewayUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all decoration-none"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Sertifikat
                                    </a>
                                )}

                                {/* Publish / Re-upload button - restricted to sekretariat & admin */}
                                {(!certificateCid || isFallbackCid) && (user?.role === 'sekretariat' || user?.role === 'admin') && (
                                    <button 
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer ${
                                            isFallbackCid
                                                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                                                : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                        } ${publishing ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                                    >
                                        <UploadCloud className={`w-4 h-4 ${publishing ? 'animate-bounce' : ''}`} />
                                        {publishing 
                                            ? 'Uploading...' 
                                            : isFallbackCid 
                                                ? 'Re-upload ke IPFS' 
                                                : 'Publish & Release'
                                        }
                                    </button>
                                )}

                                {/* Show info for non-sekretariat/non-admin when certificate is not published yet */}
                                {!certificateCid && (user?.role !== 'sekretariat' && user?.role !== 'admin') && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-450 shadow-inner">
                                        <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
                                        <span>Menunggu Sekretariat LAM-TEK menandatangani & merilis sertifikat resmi secara on-chain</span>
                                    </div>
                                )}

                                {/* Show published badge if real CID */}
                                {hasRealCid && (
                                    <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-black text-xs uppercase tracking-wider shadow-sm">
                                         <CheckCircle className="w-4 h-4 text-emerald-650" />
                                         Sertifikat Terbit
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* External Systems Status */}
                    <div className="glass-panel-light p-6 rounded-2xl shadow-sm border border-slate-200/60 relative overflow-hidden group">
                        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                            <Server className="w-5 h-5 text-indigo-650" />
                            <div>
                                <h3 className="text-sm font-black text-slate-800">Integrasi Sistem Eksternal (Mock)</h3>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-mono">Real-time External Registry State</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* PDDIKTI Sync */}
                            <div className="flex justify-between items-center p-4 border border-slate-200 bg-white/50 rounded-xl shadow-sm hover:border-slate-350 transition duration-150">
                                <div className="space-y-1 pr-2">
                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5 text-indigo-500" />
                                        PDDIKTI Sync
                                    </span>
                                    <p className="text-[9px] text-slate-400 font-semibold font-mono">Pangkalan Data Pendidikan Tinggi</p>
                                </div>
                                {pddiktiSynced ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[9px] font-black text-emerald-850 uppercase tracking-wide shadow-sm">
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        Synced
                                    </span>
                                ) : syncingPddikti ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-wide animate-pulse">
                                        <RefreshCw className="w-3 h-3 text-slate-450 animate-spin" />
                                        Syncing...
                                    </span>
                                ) : (
                                    <button 
                                        onClick={handleSyncPddikti}
                                        disabled={!hasRealCid}
                                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                                    >
                                        Sync Now
                                    </button>
                                )}
                            </div>

                            {/* BAN-PT Database */}
                            <div className="flex justify-between items-center p-4 border border-slate-200 bg-white/50 rounded-xl shadow-sm hover:border-slate-350 transition duration-150">
                                <div className="space-y-1 pr-2">
                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                        <Server className="w-3.5 h-3.5 text-indigo-500" />
                                        BAN-PT Database
                                    </span>
                                    <p className="text-[9px] text-slate-400 font-semibold font-mono">Direktori Sertifikasi Nasional</p>
                                </div>
                                {banptSynced ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[9px] font-black text-emerald-850 uppercase tracking-wide shadow-sm">
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        Synced
                                    </span>
                                ) : syncingBanpt ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-wide animate-pulse">
                                        <RefreshCw className="w-3 h-3 text-slate-450 animate-spin" />
                                        Syncing...
                                    </span>
                                ) : (
                                    <button 
                                        onClick={handleSyncBanpt}
                                        disabled={!hasRealCid}
                                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                                    >
                                        Sync Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Premium Status/Confirmation Modal */}
            {modalConfig.show && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200/85 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 animate-scale-up">
                        <div className="flex flex-col items-center text-center space-y-4">
                            {/* Icon Container */}
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border shadow-sm ${
                                modalConfig.type === 'success' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100/50'
                                    : modalConfig.type === 'error'
                                    ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-rose-100/50'
                                    : modalConfig.type === 'warning'
                                    ? 'bg-amber-50 border-amber-100 text-amber-600 shadow-amber-100/50'
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-indigo-100/50'
                            }`}>
                                {modalConfig.type === 'success' && <CheckCircle className="w-7 h-7" />}
                                {modalConfig.type === 'error' && <AlertTriangle className="w-7 h-7" />}
                                {modalConfig.type === 'warning' && <AlertTriangle className="w-7 h-7" />}
                                {modalConfig.type === 'confirm' && <ShieldCheck className="w-7 h-7" />}
                            </div>

                            {/* Title & Message */}
                            <div className="space-y-1.5">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">{modalConfig.title}</h3>
                                <p className="text-slate-500 text-sm font-semibold leading-relaxed px-2">{modalConfig.message}</p>
                            </div>
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                            {modalConfig.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 text-center border border-slate-200/50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalConfig(prev => ({ ...prev, show: false }));
                                            if (modalConfig.onConfirm) modalConfig.onConfirm();
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 text-center"
                                    >
                                        Ya, Terbitkan
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setModalConfig(prev => ({ ...prev, show: false }))}
                                    className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 text-center border border-slate-200/50"
                                >
                                    Mengerti
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReleasePage;
