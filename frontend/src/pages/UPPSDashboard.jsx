import { useState, useEffect } from 'react';
import { createSubmission } from '../services/api';
import wsService from '../services/websocket';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, FileCheck, Download } from 'lucide-react';

export default function UPPSDashboard() {
  const [formData, setFormData] = useState({
    programStudi: '',
    institusi: '',
    programType: 'S', // Default to Sarjana
  });
  const [ledFile, setLedFile] = useState(null);
  const [lkpsFile, setLkpsFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ type: '', message: '' });

  useEffect(() => {
    wsService.connect('upps');

    wsService.on('SubmissionCreated', (data) => {
      console.log('Submission created:', data);
      addNotification('Submission berhasil dibuat!', 'success');
    });

    wsService.on('SubmissionDecided', (data) => {
      console.log('Submission decided:', data);
      addNotification(
        `Submission ${data.payload?.submissionId} telah ${data.payload?.status}!`,
        data.payload?.status === 'approved' ? 'success' : 'warning'
      );
    });

    // Listen for upload progress updates
    wsService.on('UploadProgress', (data) => {
      console.log('[Frontend] Upload progress update:', data);
      const { step, status, message } = data;
      
      if (status === 'processing') {
        updateProgress(step, 'processing', message);
      } else if (status === 'completed') {
        updateProgress(step, 'completed', message);
      }
    });

    return () => {
      wsService.disconnect();
    };
  }, []);

  const addNotification = (message, type = 'info') => {
    const notification = { id: Date.now(), message, type };
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
      
      // Debug scoring data
      if (response.ai) {
        console.log('[Frontend] AI data:', response.ai);
        if (response.ai.scoring) {
          console.log('[Frontend] Scoring data found:', response.ai.scoring);
          console.log('[Frontend] Scoring results:', response.ai.scoring.results);
          console.log('[Frontend] Results length:', response.ai.scoring.results?.length || 0);
        } else {
          console.log('[Frontend] No scoring data in AI response');
        }
      } else {
        console.log('[Frontend] No AI data in response');
      }
      
      // Mark all steps as completed
      updateProgress(1, 'completed', 'LED terverifikasi');
      updateProgress(2, 'completed', 'LKPS terverifikasi');
      updateProgress(3, 'completed', 'Analisis AI selesai');
      updateProgress(4, 'completed', 'Skoring LAM-TEK 2025 selesai');
      updateProgress(5, 'completed', 'Upload ke IPFS selesai');
      updateProgress(6, 'completed', 'Upload berhasil - Scoring tersedia');
      
      setResult(response);
      
      // Show success modal
      setModalContent({
        type: 'success',
        message: 'Dokumen berhasil diverifikasi dan diupload! Semua dokumen valid.'
      });
      addNotification('Upload berhasil! Dokumen telah diverifikasi.', 'success');
      
      setFormData({ programStudi: '', institusi: '', programType: 'S' });
      setLedFile(null);
      setLkpsFile(null);
      setAdditionalFiles([]);
      
      // Force immediate display of result - no need to wait
      setShowModal(false);  // Close progress modal immediately
      
      // Auto close success modal after showing immediately
      setTimeout(() => {
        // Result is already set and visible
        console.log('[Frontend] Upload completed successfully, result displayed');
      }, 100);
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
        errorMsg = 'Tidak dapat terhubung ke backend. Pastikan server FastAPI sedang berjalan.';
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
    } finally {
      setUploading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-8 animate-fade-in">
            {modalContent.type === 'progress' && (
              <div>
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <Clock className="w-16 h-16 text-blue-600 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {uploadProgress.step}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Memproses Dokumen
                  </h3>
                  <p className="text-gray-600">
                    Mohon tunggu, sistem sedang memverifikasi dan menganalisis dokumen Anda
                  </p>
                </div>
                
                <div className="space-y-3">
                  {uploadProgress.steps.map((step) => (
                    <div 
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        step.status === 'completed' ? 'bg-green-50' :
                        step.status === 'processing' ? 'bg-blue-50 border-2 border-blue-300' :
                        'bg-gray-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                        'bg-gray-300'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : step.status === 'processing' ? (
                          <Clock className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <span className="text-white text-sm font-bold">{step.id}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          step.status === 'completed' ? 'text-green-700' :
                          step.status === 'processing' ? 'text-blue-700' :
                          'text-gray-500'
                        }`}>
                          {step.name}
                        </p>
                        {step.message && (
                          <p className={`text-xs mt-1 ${
                            step.status === 'completed' ? 'text-green-600' :
                            step.status === 'processing' ? 'text-blue-600' :
                            'text-gray-500'
                          }`}>
                            {step.message}
                          </p>
                        )}
                        {step.status === 'processing' && !step.message && (
                          <p className="text-xs text-blue-600 mt-1">Sedang diproses...</p>
                        )}
                        {step.status === 'completed' && !step.message && (
                          <p className="text-xs text-green-600 mt-1">Selesai</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(uploadProgress.step / 6) * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-2">
                    {Math.round((uploadProgress.step / 6) * 100)}% selesai
                  </p>
                </div>
              </div>
            )}
            
            {modalContent.type === 'success' && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-green-700 mb-2">
                  Upload Berhasil!
                </h3>
                <p className="text-gray-600 whitespace-pre-line">
                  {modalContent.message}
                </p>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Dokumen telah diverifikasi AI<br/>
                    ✓ Tersimpan di IPFS<br/>
                    ✓ Tercatat di Blockchain
                  </p>
                </div>
              </div>
            )}
            
            {modalContent.type === 'error' && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-red-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-red-700 mb-2">
                  Validasi Gagal
                </h3>
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 whitespace-pre-line text-left text-sm">
                    {modalContent.message}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
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

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
            <FileText className="w-10 h-10 text-blue-600" />
            Dashboard UPPS
          </h1>
          <p className="text-lg text-gray-600">Upload dan Verifikasi Dokumen Akreditasi</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Upload Dokumen Akreditasi
              </h2>
              <p className="text-sm text-gray-600">LED dan LKPS wajib diupload untuk proses akreditasi</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Program Studi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.programStudi}
                  onChange={(e) => setFormData({ ...formData, programStudi: e.target.value })}
                  placeholder="e.g., Teknik Industri Pertanian"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Institusi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.institusi}
                  onChange={(e) => setFormData({ ...formData, institusi: e.target.value })}
                  placeholder="e.g., IPB University"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jenjang Program <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.programType}
                  onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <span>LED (Laporan Evaluasi Diri) <span className="text-red-500">*</span></span>
              </label>
              <div className="border-3 border-dashed border-blue-300 rounded-xl p-6 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setLedFile(e.target.files[0])}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                  required
                />
              </div>
              {ledFile && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{ledFile.name}</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <span>LKPS (Laporan Kinerja Program Studi) <span className="text-red-500">*</span></span>
              </label>
              <div className="border-3 border-dashed border-purple-300 rounded-xl p-6 bg-white hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setLkpsFile(e.target.files[0])}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
                  required
                />
              </div>
              {lkpsFile && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{lkpsFile.name}</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Dokumen Tambahan (Opsional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-white hover:border-gray-400 transition-all">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setAdditionalFiles(Array.from(e.target.files))}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-700"
                />
              </div>
              {additionalFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {additionalFiles.map((file, idx) => (
                    <div key={idx} className="p-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !ledFile || !lkpsFile}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {uploading ? (
                <>
                  <Clock className="w-6 h-6 animate-spin" />
                  <span>Memproses & Memverifikasi...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span>Upload Dokumen</span>
                </>
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-green-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-700">
                  Upload Berhasil!
                </h3>
                <p className="text-gray-600">Dokumen telah diverifikasi dan tersimpan</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium mb-1">Submission ID</p>
                <p className="font-mono text-lg text-blue-900 font-bold">{result.submissionId}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                <p className="text-sm text-green-700 font-medium mb-1">Status</p>
                <span className="inline-block px-4 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                  {result.status}
                </span>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                <p className="text-sm text-purple-700 font-medium mb-1">Kelengkapan Dokumen</p>
                <div className="flex items-center gap-2 mt-2">
                  {result.ai.hasLED && (
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                      ✓ LED
                    </span>
                  )}
                  {result.ai.hasLKPS && (
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                      ✓ LKPS
                    </span>
                  )}
                </div>
              </div>
              {result.ai.scoring && (
                <div className="col-span-full">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-blue-900">🎯 Hasil Scoring LAM-TEK 2025</h4>
                        <p className="text-sm text-blue-700">
                          Metode: {result.ai.scoring.method || 'LAM-TEK 2025'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-blue-900">
                          {result.ai.scoring.overall_percentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-blue-700">
                          ({result.ai.scoring.total_score.toFixed(1)}/{result.ai.scoring.total_indicators} butir)
                        </div>
                      </div>
                    </div>
                    
                    {/* Grade Display - Prominent */}
                    <div className="text-center mb-4">
                      <span className={`inline-block px-8 py-4 rounded-2xl text-3xl font-bold ${
                        result.ai.scoring.grade === 'A' || result.ai.scoring.overall_grade === 'A' ? 'bg-green-600 text-white' :
                        result.ai.scoring.grade === 'B' || result.ai.scoring.overall_grade === 'B' ? 'bg-blue-600 text-white' :
                        result.ai.scoring.grade === 'C' || result.ai.scoring.overall_grade === 'C' ? 'bg-yellow-600 text-white' :
                        result.ai.scoring.grade === 'D' || result.ai.scoring.overall_grade === 'D' ? 'bg-orange-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        Grade: {result.ai.scoring.grade || result.ai.scoring.overall_grade}
                        {result.ai.scoring.grade_description && ` (${result.ai.scoring.grade_description})`}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-blue-200 rounded-full h-6">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-1000 flex items-center justify-center"
                          style={{ width: `${result.ai.scoring.overall_percentage}%` }}
                        >
                          <span className="text-white text-sm font-bold">{result.ai.scoring.overall_percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* LAM-TEK Summary */}
                    <div className="text-center text-blue-800">
                      <p className="text-lg">
                        <span className="font-bold">{result.ai.scoring.total_indicators}</span> butir penilaian LAM-TEK
                      </p>
                      <p className="text-sm mt-1">
                        Skor total: <span className="font-bold">{result.ai.scoring.total_score.toFixed(1)}</span> dari {result.ai.scoring.total_indicators}
                      </p>
                      {result.ai.scoring.lamtek_details && (
                        <p className="text-xs mt-2 text-blue-600">
                          Task 1: {result.ai.scoring.lamtek_details.summary?.task1_score || 0} | 
                          Task 2: {result.ai.scoring.lamtek_details.summary?.task2_score || 0} | 
                          Task 3: {result.ai.scoring.lamtek_details.summary?.task3_score || 0} | 
                          Task 4: {result.ai.scoring.lamtek_details.summary?.task4_score || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!result.ai.scoring && (
                <div className="col-span-full">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-dashed border-gray-300">
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">🎯 Hasil Scoring Otomatis</h4>
                    <p className="text-gray-600 mb-4">Scoring sedang diproses atau tidak tersedia</p>
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                      <span className="text-gray-600">Menunggu hasil scoring...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">📄 Dokumen Terupload</h4>
                <div className="space-y-3">
                  {result.documents.map((doc, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{doc.type}</p>
                              <p className="text-sm text-gray-600">{doc.filename}</p>
                              {doc.verified && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Terverifikasi {(doc.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500"><span className="font-medium">CID:</span> {doc.cid}</p>
                                <p className="text-xs text-gray-500"><span className="font-medium">Hash:</span> {doc.hash}</p>
                              </div>
                            </div>
                            <a
                              href={`https://ivory-fancy-junglefowl-107.mypinata.cloud/ipfs/${doc.cid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.filename}
                              className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold"
                            >
                              <Download size={16} />
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.ai.recommendations && result.ai.recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    💡 Rekomendasi AI
                  </h4>
                  <ul className="space-y-2">
                    {result.ai.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-blue-800">
                        <span className="text-blue-600 font-bold">•</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
