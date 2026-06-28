import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSubmission } from '../services/api';
import wsService from '../services/websocket';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, FileCheck, Download, RefreshCw, TrendingUp, Banknote, ShieldAlert } from 'lucide-react';
import ScoringDetailDropdown from '../components/ScoringDetailDropdown';

export default function UPPSDashboard({ user }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    programStudi: user?.program_studi || '',
    institusi: user?.institution || '',
    programType: 'S', // Default to Sarjana
  });
  // Program Studi & Institusi diambil otomatis dari akun UPPS (database); dikunci jika sudah tersimpan
  const prodiFromAccount = Boolean(user?.program_studi);
  const institusiFromAccount = Boolean(user?.institution);
  const [ledFile, setLedFile] = useState(null);
  const [lkpsFile, setLkpsFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ type: '', message: '' });
  const notificationCounterRef = useRef(0); // Counter untuk unique ID
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef(null);
  const [statistics, setStatistics] = useState({
    totalSubmissions: 0,
    sedangDiproses: 0,
    disetujui: 0,
    skorTerakhir: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [pendingPayment, setPendingPayment] = useState(null);

  // Function to fetch statistics from backend
  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const submissions = result.data || [];
        const stats = {
          totalSubmissions: submissions.length,
          sedangDiproses: submissions.filter(s => s.status === 'pending' || s.status === 'under_review').length,
          disetujui: submissions.filter(s => s.status === 'approved').length,
          skorTerakhir: submissions.length > 0 && submissions[0].ai?.scoring?.finalScore 
            ? submissions[0].ai.scoring.finalScore.toFixed(2)
            : 0
        };
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Function to download document
  const handleDownload = async (submissionId, documentType, filename) => {
    try {
      // Use API base URL from environment variable (works in both dev and production)
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/download/${submissionId}/${documentType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        const error = await response.json();
        addNotification(`Download failed: ${error.message}`, 'error');
        return;
      }

      // Get blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addNotification(`${documentType} downloaded successfully`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      addNotification(`Download failed: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchStatistics(); // Fetch statistics on mount
    fetchPaymentStatus(); // Check payment verification status
    
    const wsId = (user && (user.username || user.id)) || 'upps';
    wsService.connect(wsId);

    wsService.on('SubmissionCreated', (data) => {
      console.log('Submission created:', data);
      addNotification('Submission berhasil dibuat!', 'success');
      fetchStatistics(); // Refresh stats after new submission
    });

    wsService.on('SubmissionDecided', (data) => {
      console.log('Submission decided:', data);
      addNotification(
        `Submission ${data.payload?.submissionId} telah ${data.payload?.status}!`,
        data.payload?.status === 'approved' ? 'success' : 'warning'
      );
    });

    // Listen for upload progress updates
    wsService.on('upload_progress', (data) => {
      console.log('[Frontend] Upload progress:', data);
      const { stage, progress, message, details } = data.data || data;
      
      // Update progress steps based on stage
      if (stage === 'started') {
        updateProgress(1, 'processing', 'Memulai verifikasi...');
      } else if (stage === 'analysis_starting') {
        updateProgress(1, 'completed', 'LED terverifikasi');
        updateProgress(2, 'completed', 'LKPS terverifikasi');
        updateProgress(3, 'processing', 'Analisis AI dimulai...');
      } else if (stage === 'scoring') {
        updateProgress(3, 'completed', 'Analisis AI selesai');
        updateProgress(4, 'processing', 'Menghitung skor LAM-TEK...');
      } else if (stage === 'blockchain') {
        updateProgress(4, 'completed', 'Skoring selesai');
        updateProgress(5, 'completed', 'Upload IPFS selesai');
        updateProgress(6, 'processing', 'Menyimpan ke blockchain...');
      } else if (stage === 'blockchain_complete') {
        updateProgress(6, 'completed', 'Tersimpan di blockchain');
      }
      
      if (message) {
        addNotification(message, 'info');
      }
    });

    // Listen for analysis progress
    wsService.on('analysis_progress', (data) => {
      console.log('[Frontend] Analysis progress:', data);
      const { stage, message, progress } = data.data || data;
      
      if (stage === 'extracting') {
        updateProgress(3, 'processing', 'Menganalisis dokumen dengan AI...');
      } else if (stage === 'analysis_complete') {
        updateProgress(3, 'completed', message || 'Analisis AI selesai');
      }
      
      if (message) {
        addNotification(message, 'info');
      }
    });

    // Listen for scoring updates
    wsService.on('scoring_update', (data) => {
      console.log('[Frontend] Scoring update:', data);
      const scoring = data.data || data;
      updateProgress(4, 'completed', `Skor: ${scoring.finalScore.toFixed(2)}/${scoring.maxPossibleScore}`);
      addNotification(`Scoring complete! Final Score: ${scoring.finalScore.toFixed(2)}/${scoring.maxPossibleScore} (Overall: ${scoring.overallScore.toFixed(2)}/4.00)`, 'success');
      
      // Update result with scoring data if we already have a result
      if (result) {
        console.log('[Frontend] Updating existing result with scoring data');
        setResult(prev => ({
          ...prev,
          ai: {
            ...(prev?.ai || {}),
            scoring: scoring
          }
        }));
      }
    });

    // Listen for success
    wsService.on('success', (data) => {
      console.log('[Frontend] Success:', data);
      const { message, submission } = data.data || data;
      
      // If we get submission data via WebSocket, set it as result
      if (submission) {
        console.log('[Frontend] Setting result from WebSocket:', submission);
        setResult(submission);
        
        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        
        // Show success and close modal after delay
        setTimeout(() => {
          setShowModal(false);
          setUploading(false);
        }, 2000);
      }
      
      if (message) {
        addNotification(message, 'success');
      }
    });

    // Listen for errors
    wsService.on('error', (data) => {
      console.log('[Frontend] Error:', data);
      const { message } = data.error || data;
      if (message) {
        addNotification(message, 'error');
      }
    });

    // Setelah reconnect (mis. WiFi sempat putus), pesan selama gap mungkin hilang →
    // segarkan data agar tampilan tidak desync dengan backend.
    wsService.on('reconnected', () => {
      console.log('[Frontend] WebSocket reconnected — refetch data');
      fetchStatistics();
      addNotification('Koneksi real-time tersambung kembali.', 'info');
    });

    return () => {
      wsService.disconnect();
    };
  }, [user]);

  // Fetch payment verification status
  const fetchPaymentStatus = async () => {
    setPaymentLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sekretariat/payments/check-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentVerified(data.paymentVerified);
        setPendingPayment(data.pendingPayment || null);
      } else {
        // If endpoint doesn't exist yet or error, default to not verified
        setPaymentVerified(false);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentVerified(false);
    } finally {
      setPaymentLoading(false);
    }
  };

  const addNotification = (message, type = 'info') => {
    // Use timestamp + counter to ensure uniqueness
    notificationCounterRef.current += 1;
    const notification = { id: `${Date.now()}-${notificationCounterRef.current}`, message, type };
    setNotifications(prev => [notification, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const [uploadProgress, setUploadProgress] = useState({
    step: 0,
    steps: [
      { id: 1, name: 'Verifikasi LED', status: 'pending' },
      { id: 2, name: 'Verifikasi LKPS', status: 'pending' },
      { id: 3, name: 'Analisis AI', status: 'pending' },
      { id: 4, name: 'Skoring LAM-TEK 2025', status: 'pending' },
      { id: 5, name: 'Upload ke IPFS', status: 'pending' },
      { id: 6, name: 'Simpan ke Blockchain', status: 'pending' }
    ]
  });

  const updateProgress = (stepId, status, message) => {
    setUploadProgress(prev => ({
      ...prev,
      step: stepId,
      steps: prev.steps.map(s => 
        s.id === stepId ? { ...s, status, message } : 
        s.id < stepId ? { ...s, status: 'completed' } : s
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.programStudi || !formData.institusi || !formData.programType) {
      setError('Mohon lengkapi semua field');
      return;
    }

    if (!ledFile || !lkpsFile) {
      setError('LED dan LKPS wajib diupload!');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    
    // Start timer
    const start = Date.now();
    setStartTime(start);
    setElapsedTime(0);
    
    // Start timer interval (update every second)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    
    // Reset progress
    setUploadProgress({
      step: 0,
      steps: [
        { id: 1, name: 'Memverifikasi LED', status: 'pending' },
        { id: 2, name: 'Memverifikasi LKPS', status: 'pending' },
        { id: 3, name: 'Analisis AI', status: 'pending' },
        { id: 4, name: 'Analisis Skoring', status: 'pending' },
        { id: 5, name: 'Upload ke IPFS', status: 'pending' },
        { id: 6, name: 'Simpan ke Blockchain', status: 'pending' }
      ]
    });
    
    // Show progress modal
    setModalContent({
      type: 'progress',
      message: 'Memproses dokumen Anda...'
    });
    setShowModal(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('programStudi', formData.programStudi);
      formDataToSend.append('institusi', formData.institusi);
      formDataToSend.append('programType', formData.programType);
      formDataToSend.append('led_file', ledFile);
      formDataToSend.append('lkps_file', lkpsFile);
      
      additionalFiles.forEach(file => {
        formDataToSend.append('additional_files', file);
      });

      console.log('[Frontend] Sending upload request to backend...');
      
      // Step 1: Start upload process
      updateProgress(1, 'processing', 'Memulai proses upload...');
      
      // Make the actual API call immediately (no setTimeout delays!)
      console.log('[Frontend] Calling createSubmission API...');
      const response = await createSubmission(formDataToSend);
      console.log('[Frontend] Upload response received:', response);
      console.log('[Frontend] Full response structure:', JSON.stringify(response, null, 2));
      
      // Backend sends data in response.submission
      const submissionData = response.submission || response;
      console.log('[Frontend] Submission data:', submissionData);
      
      // Debug scoring data
      if (submissionData.ai) {
        console.log('[Frontend] ✅ AI data found in submission');
        console.log('[Frontend] AI keys:', Object.keys(submissionData.ai));
        if (submissionData.ai.scoring) {
          console.log('[Frontend] ✅✅ Scoring data found:', submissionData.ai.scoring);
          console.log('[Frontend] Scoring grade:', submissionData.ai.scoring.grade);
          console.log('[Frontend] Scoring overallScore:', submissionData.ai.scoring.overallScore);
        } else {
          console.log('[Frontend] ❌ No scoring in submission.ai');
          console.log('[Frontend] AI notes:', submissionData.ai.notes);
        }
      } else {
        console.log('[Frontend] ❌ No AI data in submission');
      }
      
      // Mark all steps as completed
      updateProgress(1, 'completed', 'LED terverifikasi');
      updateProgress(2, 'completed', 'LKPS terverifikasi');
      updateProgress(3, 'completed', 'Analisis AI selesai');
      updateProgress(4, 'completed', 'Skoring LAM-TEK 2025 selesai');
      updateProgress(5, 'completed', 'Upload ke IPFS selesai');
      updateProgress(6, 'completed', 'Upload berhasil - Scoring tersedia');
      
      setResult(submissionData);
      
      // Show success modal briefly, then hide to show result
      setModalContent({
        type: 'success',
        message: 'Dokumen berhasil diverifikasi dan diupload! Semua dokumen valid.'
      });
      addNotification('Upload berhasil! Dokumen telah diverifikasi.', 'success');
      
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      console.log(`[Frontend] Total processing time: ${totalTime} seconds`);
      
      // Close modal after 2 seconds to show result
      setTimeout(() => {
        setShowModal(false);
        console.log('[Frontend] Upload completed successfully, showing result');
      }, 2000);
      
      // Reset form but keep result visible
      // Don't reset form immediately, let user see the result first
    } catch (err) {
      let errorMsg = 'Terjadi kesalahan yang tidak diketahui.';

      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response) {
        if (err.response.status === 502) {
          errorMsg = 'Dokumen terverifikasi gagal disimpan ke blockchain. Mohon pastikan layanan Hyperledger Fabric REST sedang berjalan.';
        } else {
          errorMsg = `Server mengembalikan status ${err.response.status}.`;
        }
      } else if (err.message === 'Network Error') {
        errorMsg = 'Tidak dapat terhubung ke backend. Pastikan server Express.js sedang berjalan di http://localhost:8000';
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        // Timeout is OK - WebSocket will send updates
        console.log('[Frontend] HTTP request timeout - relying on WebSocket for updates');
        addNotification('Proses berlanjut di backend. Tunggu update melalui WebSocket...', 'info');
        
        // Don't show error modal, keep progress modal open
        // WebSocket will handle the rest
        return; // Exit without setting error
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      
      // Show error modal
      setModalContent({
        type: 'error',
        message: `Validasi Gagal!\n\n${errorMsg}\n\nPastikan dokumen yang diupload adalah LED dan LKPS yang valid.`
      });
      addNotification('Upload gagal: ' + errorMsg, 'error');
      
      // Stop timer on error
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    } finally {
      setUploading(false);
    }
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const getNotificationColor = (type) => {
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    return colors[type] || 'bg-blue-500';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-auto">
          
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl shadow-2xl shadow-indigo-900/30 max-w-lg w-full p-8 animate-fade-in overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            {modalContent.type === 'progress' && (
              <div className="relative">
                <div className="text-center mb-7">
                  {/* Animated ring */}
                  <div className="flex justify-center mb-5">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#312e81" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34"
                          fill="none"
                          stroke="url(#progressGrad)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 34}`}
                          strokeDashoffset={`${2 * Math.PI * 34 * (1 - uploadProgress.step / 6)}`}
                          className="transition-all duration-700"
                        />
                        <defs>
                          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#a78bfa" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{uploadProgress.step}</span>
                        <span className="text-[10px] text-indigo-300 font-bold">/ 6</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">Memproses Dokumen</h3>
                  <p className="text-indigo-300 text-sm font-medium">Sistem sedang memverifikasi dan menganalisis dokumen Anda</p>
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{animationDuration:'3s'}} />
                    <span className="text-xs font-bold text-indigo-300">
                      Waktu proses: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {uploadProgress.steps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                        step.status === 'completed'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : step.status === 'processing'
                          ? 'bg-indigo-500/15 border border-indigo-400/30 shadow-sm shadow-indigo-900/20'
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        step.status === 'completed'
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : step.status === 'processing'
                          ? 'bg-indigo-500 text-white animate-pulse shadow-sm shadow-indigo-500/30'
                          : 'bg-white/10 text-slate-400'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : step.status === 'processing' ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${
                          step.status === 'completed' ? 'text-emerald-300' :
                          step.status === 'processing' ? 'text-indigo-200' :
                          'text-slate-500'
                        }`}>{step.name}</p>
                        {step.status === 'processing' && !step.message && (
                          <p className="text-[11px] text-indigo-400">Memulai verifikasi...</p>
                        )}
                        {step.message && (
                          <p className={`text-[11px] ${
                            step.status === 'completed' ? 'text-emerald-400' : 'text-indigo-400'
                          }`}>{step.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 shadow-sm shadow-indigo-500/50"
                      style={{ width: `${(uploadProgress.step / 6) * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-indigo-400 font-bold mt-2">
                    {Math.round((uploadProgress.step / 6) * 100)}% selesai
                  </p>
                </div>
              </div>
            )}

            {modalContent.type === 'success' && (
              <div className="text-center relative">
                <div className="flex justify-center mb-5">
                  <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Unggah Berhasil!</h3>
                <p className="text-indigo-300 text-sm mb-5 font-medium">{modalContent.message}</p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-left space-y-1.5">
                  <p className="text-emerald-300 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Dokumen telah diverifikasi AI
                  </p>
                  <p className="text-emerald-300 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Tersimpan di IPFS
                  </p>
                  <p className="text-emerald-300 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Tercatat di Blockchain
                  </p>
                </div>
              </div>
            )}

            {modalContent.type === 'error' && (
              <div className="text-center relative">
                <div className="flex justify-center mb-5">
                  <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-3">Validasi Gagal</h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5 text-left">
                  <p className="text-red-300 whitespace-pre-line text-sm font-medium">{modalContent.message}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="fixed top-20 right-5 z-50 space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`${getNotificationColor(notif.type)} text-white px-6 py-4 rounded-xl shadow-2xl min-w-[320px] animate-fade-in`}
            >
              <div className="flex items-center gap-3">
                {notif.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {notif.type === 'error' && <AlertCircle className="w-5 h-5" />}
                <span className="font-medium">{notif.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

        <div className="p-6 max-w-7xl mx-auto font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <FileText className="w-8 h-8 text-indigo-600" />
              Dashboard UPPS
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Unggah dan Verifikasi Dokumen Akreditasi Program Studi</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-600 hover:text-indigo-600 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* Card 1: Total Submission (Blue/Indigo Gradient) */}
          <div className="bg-gradient-to-tr from-blue-50/90 via-indigo-50/40 to-white border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-indigo-50/50 hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">Total Submission</p>
                <p className="text-3xl font-black text-blue-800 mt-1">
                  {loadingStats ? '...' : statistics.totalSubmissions}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-100 border border-blue-500/20">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 2: Sedang Diproses (Amber/Orange Gradient) */}
          <div className="bg-gradient-to-tr from-amber-50/90 via-orange-50/40 to-white border border-amber-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-amber-50/50 hover:border-amber-300 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">Sedang Diproses</p>
                <p className="text-3xl font-black text-amber-800 mt-1">
                  {loadingStats ? '...' : statistics.sedangDiproses}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-amber-100 border border-amber-400/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 3: Disetujui (Emerald/Green Gradient) */}
          <div className="bg-gradient-to-tr from-emerald-50/90 via-teal-50/40 to-white border border-emerald-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-emerald-50/50 hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider">Disetujui</p>
                <p className="text-3xl font-black text-emerald-800 mt-1">
                  {loadingStats ? '...' : statistics.disetujui}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-100 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 4: Skor Terakhir (Fuchsia/Purple Gradient) */}
          <div className="bg-gradient-to-tr from-fuchsia-50/90 via-purple-50/40 to-white border border-fuchsia-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-fuchsia-50/50 hover:border-fuchsia-300 transition-all duration-300 transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-fuchsia-600 font-extrabold uppercase tracking-wider">Skor Terakhir</p>
                <p className="text-3xl font-black text-fuchsia-800 mt-1">
                  {loadingStats ? '...' : statistics.skorTerakhir}
                </p>
              </div>
              <div className="w-12 h-12 bg-fuchsia-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-fuchsia-100 border border-fuchsia-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="glass-panel-light rounded-2xl shadow-xl shadow-slate-200/40 p-8 mb-6 border border-indigo-100/50 relative">
          
          {pendingPayment && (
            <div className={`p-4 mb-6 rounded-xl border-2 flex items-center justify-between shadow-sm animate-fade-in ${
              pendingPayment.status === 'invoiced' ? 'bg-amber-50/70 border-amber-200 text-amber-800' :
              pendingPayment.status === 'submitted' ? 'bg-indigo-50/70 border-indigo-200 text-indigo-800' :
              pendingPayment.status === 'verified' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
              'bg-rose-50/70 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  pendingPayment.status === 'invoiced' ? 'bg-amber-100 text-amber-600' :
                  pendingPayment.status === 'submitted' ? 'bg-indigo-100 text-indigo-600' :
                  pendingPayment.status === 'verified' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-rose-100 text-rose-600'
                }`}>
                  <Banknote className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="font-bold text-sm">Status Tagihan Akreditasi: </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    pendingPayment.status === 'invoiced' ? 'bg-amber-100 text-amber-800' :
                    pendingPayment.status === 'submitted' ? 'bg-indigo-100 text-indigo-800' :
                    pendingPayment.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {pendingPayment.status === 'invoiced' ? 'Menunggu Pembayaran' :
                     pendingPayment.status === 'submitted' ? 'Menunggu Verifikasi' :
                     pendingPayment.status === 'verified' ? 'Terverifikasi' :
                     'Ditolak'}
                  </span>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Jumlah Tagihan: Rp {Number(pendingPayment.amount || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/upps/payment')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-indigo-600 rounded-lg text-xs font-extrabold border border-indigo-200 transition-all shadow-sm cursor-pointer"
              >
                Detail Pembayaran
              </button>
            </div>
          )}

          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Unggah Dokumen Akreditasi
              </h2>
              <p className="text-sm text-slate-500 font-semibold">LED dan LKPS wajib diunggah untuk memulai proses akreditasi LAM-TEK</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 ml-1">
                  Program Studi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.programStudi}
                  onChange={(e) => setFormData({ ...formData, programStudi: e.target.value })}
                  placeholder="e.g., Teknik Industri Pertanian"
                  readOnly={prodiFromAccount}
                  className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm outline-none transition-all ${prodiFromAccount ? 'bg-slate-100/80 cursor-not-allowed' : 'bg-white/70'}`}
                  required
                />
                {prodiFromAccount && (
                  <p className="text-[11px] text-slate-400 font-semibold ml-1">Otomatis dari akun Anda</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 ml-1">
                  Institusi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.institusi}
                  onChange={(e) => setFormData({ ...formData, institusi: e.target.value })}
                  placeholder="e.g., IPB University"
                  readOnly={institusiFromAccount}
                  className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm outline-none transition-all ${institusiFromAccount ? 'bg-slate-100/80 cursor-not-allowed' : 'bg-white/70'}`}
                  required
                />
                {institusiFromAccount && (
                  <p className="text-[11px] text-slate-400 font-semibold ml-1">Otomatis dari akun Anda</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 ml-1">
                  Jenjang Program <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.programType}
                  onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                  className="w-full px-4 py-3 bg-white/70 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1.2rem_center] bg-no-repeat"
                  required
                >
                  <option value="S">Sarjana (S)</option>
                  <option value="D">Doktor (D)</option>
                  <option value="PPI">Profesi Insinyur (PPI)</option>
                  <option value="D1">Diploma Satu (D1)</option>
                  <option value="D2">Diploma Dua (D2)</option>
                  <option value="D3">Diploma Tiga (D3)</option>
                  <option value="STr">Sarjana Terapan (STr)</option>
                  <option value="M">Magister (M)</option>
                  <option value="MTr">Magister Terapan (MTr)</option>
                  <option value="DTr">Doktor Terapan (DTr)</option>
                </select>
              </div>
            </div>

            {/* LED Upload Box (Vibrant Indigo/Blue Gradient Frame) */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/20 rounded-2xl p-6 border border-indigo-100/80 shadow-sm">
              <label className="block text-sm font-bold text-indigo-950 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-indigo-100">
                  <FileCheck className="w-5 h-5" />
                </div>
                <span>LED (Laporan Evaluasi Diri) <span className="text-rose-500">*</span></span>
              </label>
              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white/70 hover:bg-indigo-50/20 transition-all rounded-xl p-6 cursor-pointer relative group">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setLedFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer"
                  required
                />
              </div>
              {ledFile && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 animate-fade-in shadow-inner">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">{ledFile.name}</span>
                </div>
              )}
            </div>

            {/* LKPS Upload Box (Vibrant Purple/Fuchsia Gradient Frame) */}
            <div className="bg-gradient-to-br from-purple-50/50 to-fuchsia-50/20 rounded-2xl p-6 border border-purple-100/80 shadow-sm">
              <label className="block text-sm font-bold text-purple-950 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-purple-100">
                  <FileCheck className="w-5 h-5" />
                </div>
                <span>LKPS (Laporan Kinerja Program Studi) <span className="text-rose-500">*</span></span>
              </label>
              <div className="border-2 border-dashed border-purple-200 hover:border-purple-500 bg-white/70 hover:bg-purple-50/20 transition-all rounded-xl p-6 cursor-pointer relative group">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setLkpsFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
                  required
                />
              </div>
              {lkpsFile && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 animate-fade-in shadow-inner">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">{lkpsFile.name}</span>
                </div>
              )}
            </div>

            {/* Optional Additional Files (Vibrant Slate/Slate Gradient Frame) */}
            <div className="bg-gradient-to-br from-slate-50/70 to-blue-50/20 rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                Dokumen Tambahan (Opsional)
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-white/70 hover:bg-indigo-50/20 transition-all rounded-xl p-6 cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setAdditionalFiles(Array.from(e.target.files))}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-slate-600 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                />
              </div>
              {additionalFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {additionalFiles.map((file, idx) => (
                    <div key={idx} className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 animate-fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-800">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <p className="text-xs font-bold text-rose-800">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !ledFile || !lkpsFile}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 cursor-pointer transform hover:-translate-y-0.5 duration-200"
            >
              {uploading ? (
                <>
                  <Clock className="w-6 h-6 animate-spin" />
                  <span>Memproses & Memverifikasi Dokumen...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span>Unggah Dokumen Akreditasi</span>
                </>
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="glass-panel-light border-2 border-emerald-200 rounded-2xl p-8 shadow-xl shadow-emerald-50/20 mb-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200/50">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-800">
                  Unggah &amp; Verifikasi Berhasil!
                </h3>
                <p className="text-slate-600 text-sm font-semibold">Dokumen LED &amp; LKPS telah diverifikasi AI dan dicatat secara permanen di blockchain</p>
              </div>
            </div>

            {/* AI Scoring Section */}
            {result.ai?.scoring && (
              <div className="animate-fade-in">
                <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-black text-indigo-950 flex items-center gap-2">🎯 Hasil Penilaian LAM-TEK 2025</h4>
                      <p className="text-xs text-indigo-700 font-semibold">
                        Metodologi AI: {result.ai?.scoring?.method || 'LAM-TEK 2025'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-indigo-900 font-heading">
                        {(result.ai?.scoring?.overallScore || 0).toFixed(2)} / 4.00
                      </div>
                      <div className="text-[10px] text-indigo-700 font-extrabold uppercase mt-0.5 tracking-wider">
                        Skor Rata-rata 7 Kriteria
                      </div>
                    </div>
                  </div>

                  {result.ai?.scoring?.summary && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/70 border border-slate-200/50 rounded-xl p-3.5 shadow-sm">
                        <div className="text-emerald-700 font-extrabold text-xs uppercase tracking-wider">Kriteria Memuaskan (≥ 3.5)</div>
                        <div className="text-3xl font-black text-emerald-800 mt-1 font-heading">{result.ai?.scoring?.summary?.criteriaAbove3_5 || 0}</div>
                      </div>
                      <div className="bg-white/70 border border-slate-200/50 rounded-xl p-3.5 shadow-sm">
                        <div className="text-rose-700 font-extrabold text-xs uppercase tracking-wider">Kriteria Perlu Perbaikan (&lt; 2.0)</div>
                        <div className="text-3xl font-black text-rose-800 mt-1 font-heading">{result.ai?.scoring?.summary?.criteriaBellow2_0 || 0}</div>
                      </div>
                    </div>
                  )}

                  <div className="text-center text-indigo-900 bg-white/70 border border-slate-200/50 rounded-xl p-4 shadow-sm mb-4">
                    <p className="text-base font-bold">Peringkat Awal Berdasarkan 7 Kriteria LAM-TEK</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Skor Kinerja Kumulatif: <span className="font-extrabold text-indigo-600 text-sm">{(result.ai?.scoring?.finalScore || 0).toFixed(2)}</span> / {result.ai?.scoring?.maxPossibleScore || 220}
                    </p>
                  </div>

                  <ScoringDetailDropdown scoring={result.ai.scoring} />
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {result?.ai?.recommendations && result.ai.recommendations.length > 0 && (
              <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 animate-fade-in mt-4">
                <h4 className="text-sm font-extrabold text-indigo-900 mb-3 flex items-center gap-2">
                  💡 Rekomendasi Perbaikan AI
                </h4>
                <ul className="space-y-2">
                  {result.ai.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-indigo-800">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span className="text-xs font-semibold">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

