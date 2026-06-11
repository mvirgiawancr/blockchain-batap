import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Banknote, Search, CheckCircle, XCircle, Clock, Eye, Download, 
  DollarSign, Plus, Receipt, FileText, AlertCircle, RefreshCw,
  Users
} from 'lucide-react';

const SekretariatPaymentPage = ({ user }) => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Create Invoice State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uppsUsers, setUppsUsers] = useState([]);
  const [loadingUpps, setLoadingUpps] = useState(false);
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    submissionId: '',
    uppsUserId: '',
    uppsName: '',
    institution: '',
    programStudi: '',
    amount: 5000000,
    description: 'Biaya Akreditasi LAM-TEK 2025',
    dueDate: ''
  });
  const [creating, setCreating] = useState(false);

  // Notification Modal State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ type: '', title: '', message: '' });

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.uppsName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.institution?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  }, [searchQuery, statusFilter, payments]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/sekretariat/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : []);
        setFilteredPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUppsUsers = async () => {
    setLoadingUpps(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/sekretariat/upps`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUppsUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading UPPS:', error);
    } finally {
      setLoadingUpps(false);
    }
  };

  const loadApprovedSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/submissions?status=approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setApprovedSubmissions(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error loading approved submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.uppsUserId || !invoiceForm.amount) {
      setNotificationContent({
        type: 'error',
        title: 'Formulir Tidak Lengkap',
        message: 'Mohon pilih UPPS dan masukkan jumlah nominal tagihan terlebih dahulu.'
      });
      setShowNotificationModal(true);
      return;
    }

    setCreating(true);
    setNotificationContent({
      type: 'processing',
      title: 'Menerbitkan Tagihan',
      message: 'Sedang mendaftarkan invoice akreditasi dan mengirimkan notifikasi ke UPPS...'
    });
    setShowNotificationModal(true);

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/sekretariat/payments/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceForm),
      });

      if (response.ok) {
        setNotificationContent({
          type: 'success',
          title: 'Tagihan Diterbitkan',
          message: 'Tagihan akreditasi berhasil diterbitkan dan dinotifikasikan ke UPPS secara real-time!'
        });
        setShowCreateModal(false);
        setInvoiceForm({
          submissionId: '',
          uppsUserId: '', uppsName: '', institution: '', programStudi: '',
          amount: 5000000, description: 'Biaya Akreditasi LAM-TEK 2025', dueDate: ''
        });
        loadPayments();
      } else {
        const err = await response.json();
        setNotificationContent({
          type: 'error',
          title: 'Gagal Menerbitkan',
          message: `Gagal menerbitkan tagihan: ${err.error || err.message}`
        });
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setNotificationContent({
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Terjadi kesalahan saat memproses penerbitan tagihan ke server.'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyPayment = async (paymentId, decision) => {
    if (decision === 'reject' && !rejectionReason.trim()) {
      setNotificationContent({
        type: 'error',
        title: 'Alasan Wajib Diisi',
        message: 'Mohon masukkan alasan penolakan bukti transfer terlebih dahulu.'
      });
      setShowNotificationModal(true);
      return;
    }

    setVerifying(true);
    setNotificationContent({
      type: 'processing',
      title: 'Memverifikasi Transaksi',
      message: `Sedang memproses keputusan ${decision === 'approve' ? 'Persetujuan' : 'Penolakan'} pembayaran...`
    });
    setShowNotificationModal(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/sekretariat/payments/${paymentId}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ decision, rejectionReason }),
        }
      );

      if (response.ok) {
        setNotificationContent({
          type: 'success',
          title: decision === 'approve' ? 'Pembayaran Disetujui' : 'Pembayaran Ditolak',
          message: `Bukti transfer pembayaran berhasil ${decision === 'approve' ? 'diverifikasi sebagai LUNAS' : 'ditolak'} dan dinotifikasikan ke UPPS.`
        });
        setSelectedPayment(null);
        setRejectionReason('');
        loadPayments();
      } else {
        setNotificationContent({
          type: 'error',
          title: 'Gagal Memproses',
          message: 'Gagal memperbarui status verifikasi pembayaran di server.'
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setNotificationContent({
        type: 'error',
        title: 'Kesalahan Sistem',
        message: 'Terjadi kesalahan sistem saat memproses verifikasi pembayaran.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      invoiced: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Menunggu Pembayaran', icon: Receipt },
      submitted: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Bukti Diunggah', icon: FileText },
      verified: { bg: 'bg-green-100 text-green-800 border-green-300', label: 'Terverifikasi', icon: CheckCircle },
      rejected: { bg: 'bg-red-100 text-red-800 border-red-300', label: 'Ditolak', icon: XCircle },
    };
    return configs[status] || configs.invoiced;
  };

  const getStats = () => {
    const total = payments.length;
    const invoiced = payments.filter(p => p.status === 'invoiced').length;
    const submitted = payments.filter(p => p.status === 'submitted').length;
    const verified = payments.filter(p => p.status === 'verified').length;
    const rejected = payments.filter(p => p.status === 'rejected').length;
    return { total, invoiced, submitted, verified, rejected };
  };

  const stats = getStats();

  const invoicedSubmissionIds = payments.map(p => {
    const sId = p.submissionId || p.submission_id || p.submissionID || p.submission_Id || '';
    return sId.toString().toLowerCase().trim();
  }).filter(Boolean);
  const eligibleSubmissions = approvedSubmissions.filter(s => {
    const subId = s.submissionId || s.id || '';
    return !invoicedSubmissionIds.includes(subId.toString().toLowerCase().trim());
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('sekretariat')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2 tracking-tight">
                <Banknote className="w-8 h-8 text-indigo-650" />
                Manajemen Pembayaran Akreditasi
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Terbitkan tagihan baru, verifikasi bukti pembayaran, dan pantau status tagihan UPPS</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadPayments}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer hover:-translate-y-0.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <button
                onClick={() => {
                  loadUppsUsers();
                  loadApprovedSubmissions();
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer hover:-translate-y-0.5 animate-pulse-subtle"
              >
                <Plus className="w-4 h-4" />
                Terbitkan Tagihan
              </button>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 border-l-4 border-l-slate-400 shadow-sm">
              <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Total Tagihan</p>
              <p className="text-xl font-black text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 border-l-4 border-l-amber-500 shadow-sm">
              <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Menunggu Bayar</p>
              <p className="text-xl font-black text-amber-700 mt-1">{stats.invoiced}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 border-l-4 border-l-blue-600 shadow-sm">
              <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Bukti Diunggah</p>
              <p className="text-xl font-black text-blue-700 mt-1">{stats.submitted}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 border-l-4 border-l-emerald-600 shadow-sm">
              <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Terverifikasi</p>
              <p className="text-xl font-black text-emerald-700 mt-1">{stats.verified}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 border-l-4 border-l-rose-600 shadow-sm">
              <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Ditolak</p>
              <p className="text-xl font-black text-rose-700 mt-1">{stats.rejected}</p>
            </div>
          </div>

          {/* Filters - Glass Box */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 mb-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nomor invoice, nama UPPS, atau institusi universitas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm font-semibold transition-all duration-205 shadow-inner-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 text-sm font-semibold transition-all duration-205 cursor-pointer"
              >
                <option value="all">Semua Status Tagihan</option>
                <option value="invoiced">Menunggu Pembayaran</option>
                <option value="submitted">Bukti Pembayaran Diunggah</option>
                <option value="verified">Terverifikasi Lunas</option>
                <option value="rejected">Pembayaran Ditolak</option>
              </select>
            </div>
          </div>

          {/* Payments List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-550 font-bold text-sm">Memuat data invoice pembayaran...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Receipt className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Data</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Tidak ada data tagihan atau invoice pembayaran yang sesuai dengan filter pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredPayments.map((payment) => {
                const config = getStatusConfig(payment.status);
                const StatusIcon = config.icon;
                
                return (
                  <div
                    key={payment.id || payment.paymentId}
                    className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 hover:shadow-md hover:border-slate-350 hover:-translate-y-0.5 shadow-sm transition-all duration-200 relative overflow-hidden flex flex-col"
                  >
                    {/* Status Top border line indicator */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                      payment.status === 'invoiced' ? 'bg-amber-500' :
                      payment.status === 'submitted' ? 'bg-blue-600' :
                      payment.status === 'verified' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`} />

                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug truncate">
                          {payment.uppsName || 'UPPS'}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{payment.institution || '-'}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold tracking-tight mt-1.5 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded inline-block">
                          {payment.invoiceNumber || payment.submissionId?.substring(0, 16) || '-'}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 flex-shrink-0 shadow-sm ${
                          payment.status === 'invoiced' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                          payment.status === 'submitted' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                          payment.status === 'verified' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
                        }`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {payment.status === 'invoiced' ? 'Pending' : payment.status === 'submitted' ? 'Bukti Masuk' : payment.status === 'verified' ? 'Lunas' : 'Ditolak'}
                      </span>
                    </div>

                    <div className="space-y-2.5 mb-5 bg-slate-50/50 rounded-xl p-3.5 border border-slate-100/50">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span className="text-lg font-black text-indigo-950 font-heading">
                          Rp {payment.amount?.toLocaleString('id-ID') || '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase pt-1 border-t border-slate-200/20">
                        <span>Tanggal Tagihan:</span>
                        <span className="text-slate-600 font-bold">{new Date(payment.createdAt).toLocaleDateString('id-ID')}</span>
                      </div>
                      {payment.proofFilename && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-650 truncate mt-1">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />
                          <span className="truncate">{payment.proofFilename}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      {payment.status === 'submitted' ? (
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                        >
                          <Eye className="w-4 h-4" />
                          Verifikasi Pembayaran
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-200/40 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                        >
                          <Eye className="w-4 h-4" />
                          Detail
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Verification/Detail Modal */}
          {selectedPayment && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500" />
                <div className="p-7 overflow-y-auto space-y-5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3">
                    {selectedPayment.status === 'submitted' ? 'Verifikasi Bukti Transaksi' : 'Rincian Bukti Transaksi'}
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50 shadow-inner-sm">
                        <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Invoice</p>
                        <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{selectedPayment.invoiceNumber || '-'}</p>
                      </div>
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50 shadow-inner-sm">
                        <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Nama UPPS</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5 truncate">{selectedPayment.uppsName || '-'}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50 shadow-inner-sm">
                      <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Asal Institusi</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedPayment.institution || '-'}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/40 border border-emerald-200/50 rounded-xl flex items-center gap-3 shadow-inner-sm">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg border border-emerald-250/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-650 font-black uppercase tracking-wider">Jumlah Pembayaran</p>
                        <p className="text-xl font-black text-emerald-700 font-heading">
                          Rp {selectedPayment.amount?.toLocaleString('id-ID') || '0'}
                        </p>
                      </div>
                    </div>
                    {selectedPayment.paymentMethod && (
                      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/50">
                        <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Metode Pembayaran</p>
                        <p className="text-sm font-bold text-slate-850 mt-0.5">{selectedPayment.paymentMethod}</p>
                      </div>
                    )}
                    {(selectedPayment.proofUrl || selectedPayment.proofFilename) && (
                      <div className="p-4 bg-indigo-50/30 border border-indigo-150/40 rounded-xl shadow-inner-sm">
                        <p className="text-[10px] text-indigo-500 font-black uppercase tracking-wider mb-2">Dokumen Bukti Transfer</p>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          <span className="text-sm font-bold text-indigo-950 truncate">
                            {selectedPayment.proofFilename || 'Bukti Transfer'}
                          </span>
                        </div>
                        {selectedPayment.proofUrl && (
                          <a
                            href={selectedPayment.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-750 font-black mt-3 text-xs uppercase tracking-wider cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            Lihat / Unduh Dokumen
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verification Actions */}
                  {selectedPayment.status === 'submitted' && (
                    <div className="space-y-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                          Alasan Penolakan <span className="text-slate-400 font-normal">(Isi jika status Pembayaran ditolak)</span>
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Masukkan alasan lengkap pembatalan atau penolakan transaksi..."
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold transition-all duration-205 shadow-inner-sm min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleVerifyPayment(selectedPayment.paymentId || selectedPayment.id, 'approve')}
                          disabled={verifying}
                          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Verifikasi Lunas
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(selectedPayment.paymentId || selectedPayment.id, 'reject')}
                          disabled={verifying}
                          className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                        >
                          <XCircle className="w-5 h-5" />
                          Tolak Transaksi
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedPayment(null);
                      setRejectionReason('');
                    }}
                    className="w-full mt-4 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/40 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Invoice Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500" />
                <div className="p-7 overflow-y-auto space-y-5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-indigo-600" />
                    Terbitkan Tagihan Akreditasi
                  </h2>
                  <p className="text-slate-500 text-xs font-semibold -mt-2">Buat dan kirimkan invoice pembayaran ke institusi UPPS terdaftar</p>

                  <div className="space-y-4.5 pt-3">
                    {/* Pilih Pengajuan Akreditasi */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Pilih Pengajuan Akreditasi <span className="text-slate-450 font-normal capitalize">(Lolos Verifikasi Dokumen)</span>
                      </label>
                      {loadingSubmissions ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-450 animate-pulse">
                          <Clock className="w-4 h-4 animate-spin text-indigo-600" />
                          Memuat data pengajuan akreditasi...
                        </div>
                      ) : (
                        <select
                          value={invoiceForm.submissionId || ''}
                          onChange={(e) => {
                            const sub = eligibleSubmissions.find(s => (s.submissionId || s.id) === e.target.value);
                            if (sub) {
                              const matchedUser = uppsUsers.find(u => 
                                u.username === sub.submittedBy || 
                                u.id === sub.submittedBy
                              ) || uppsUsers.find(u => {
                                const uInst = (u.institution || '').toLowerCase();
                                const sInst = (sub.institusi || '').toLowerCase();
                                const uProg = (u.program_studi || '').toLowerCase().replace('teknologi', 'teknik');
                                const sProg = (sub.programStudi || '').toLowerCase().replace('teknologi', 'teknik');
                                return (uInst.includes(sInst) || sInst.includes(uInst)) && 
                                       (uProg.includes(sProg) || sProg.includes(uProg));
                              }) || uppsUsers.find(u => {
                                const uInst = (u.institution || '').toLowerCase();
                                const sInst = (sub.institusi || '').toLowerCase();
                                return uInst.includes(sInst) || sInst.includes(uInst);
                              });
                              
                              setInvoiceForm({
                                ...invoiceForm,
                                submissionId: sub.submissionId || sub.id,
                                uppsUserId: matchedUser?.id || (sub.submittedBy !== 'unknown' ? sub.submittedBy : '') || '',
                                uppsName: matchedUser?.fullName || matchedUser?.name || (sub.submittedBy !== 'unknown' ? sub.submittedBy : '') || 'UPPS',
                                institution: sub.institusi || matchedUser?.institution || '',
                                programStudi: sub.programStudi || matchedUser?.program_studi || '',
                                description: `Biaya Akreditasi Program Studi ${sub.programStudi} - ${sub.institusi}`
                              });
                            } else {
                              setInvoiceForm({
                                ...invoiceForm,
                                submissionId: '',
                                uppsUserId: '',
                                uppsName: '',
                                institution: '',
                                programStudi: '',
                                description: 'Biaya Akreditasi LAM-TEK 2025'
                              });
                            }
                          }}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm font-semibold transition-all duration-205 cursor-pointer bg-white"
                        >
                          <option value="">-- Pilih Berkas Pengajuan Terlebih Dahulu --</option>
                          {eligibleSubmissions.map(s => {
                            const subId = s.submissionId || s.id || '';
                            const cleanId = subId.length > 8 ? subId.substring(0, 8).toUpperCase() : subId.toUpperCase();
                            const level = s.jenjang || s.programType || 'S1';
                            return (
                              <option key={subId} value={subId}>
                                [{level}] {s.programStudi} — {s.institusi} (ID: {cleanId})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                     {/* Select UPPS */}
                     <div>
                       <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                         Pilih UPPS Penerima Tagihan <span className="text-rose-500">*</span>
                       </label>
                       {loadingUpps ? (
                         <div className="flex items-center gap-2 text-xs font-semibold text-slate-450 animate-pulse">
                           <Clock className="w-4 h-4 animate-spin text-indigo-600" />
                           Memuat data tim UPPS...
                         </div>
                       ) : (
                         <>
                           <select
                             value={invoiceForm.uppsUserId}
                             disabled={!!invoiceForm.submissionId && !!invoiceForm.uppsUserId && invoiceForm.uppsUserId !== 'unknown'}
                             onChange={(e) => {
                               const selected = uppsUsers.find(u => u.id === e.target.value || u.username === e.target.value);
                               setInvoiceForm({
                                 ...invoiceForm,
                                 uppsUserId: e.target.value,
                                 uppsName: selected?.fullName || selected?.name || '',
                                 institution: selected?.institution || '',
                                 programStudi: selected?.program_studi || ''
                               });
                             }}
                             className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm font-semibold transition-all duration-205 cursor-pointer bg-white disabled:bg-slate-100 disabled:text-slate-500"
                           >
                             <option value="">-- Pilih UPPS --</option>
                             {uppsUsers.map(u => (
                               <option key={u.id || u.username} value={u.id || u.username}>
                                 {u.fullName || u.name} — {u.institution}
                               </option>
                             ))}
                           </select>
                           {invoiceForm.submissionId && (
                             <p className="text-[10px] text-indigo-650 font-bold mt-1.5 flex items-center gap-1">
                               <CheckCircle className="w-3.5 h-3.5" /> Otomatis terkunci berdasarkan berkas pengajuan akreditasi
                             </p>
                           )}
                         </>
                       )}
                     </div>

                    {invoiceForm.programStudi && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/30 rounded-xl border border-indigo-150/40 shadow-inner-sm">
                        <div>
                          <p className="text-[10px] uppercase font-black text-indigo-500 tracking-wider">Program Studi</p>
                          <p className="text-sm font-black text-indigo-950 mt-0.5 leading-snug">{invoiceForm.programStudi}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black text-indigo-500 tracking-wider">Asal Institusi</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5 leading-snug truncate" title={invoiceForm.institution}>{invoiceForm.institution}</p>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Jumlah Nominal Tagihan (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-805 text-sm font-semibold transition-all duration-205 shadow-inner-sm bg-white"
                        min={0}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Keterangan Tagihan
                      </label>
                      <input
                        type="text"
                        value={invoiceForm.description}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-805 text-sm font-semibold transition-all duration-205 shadow-inner-sm bg-white"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wide">
                        Batas Tanggal Jatuh Tempo
                      </label>
                      <input
                        type="date"
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-805 text-sm font-semibold transition-all duration-205 shadow-inner-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleCreateInvoice}
                      disabled={creating || !invoiceForm.uppsUserId}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-black text-xs uppercase tracking-wider disabled:opacity-50 shadow-sm cursor-pointer hover:-translate-y-0.5"
                    >
                      {creating ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin text-white" />
                          Menerbitkan...
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4" />
                          Kirim Invoice Tagihan
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-6 py-3 bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-200/40 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer hover:-translate-y-0.5 transition-all"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Notification Modal */}
          {showNotificationModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full p-8 text-center flex flex-col items-center">
                {notificationContent.type === 'processing' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm animate-pulse">
                      <Clock className="w-8 h-8 text-indigo-650 animate-spin" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">{notificationContent.title}</h3>
                    <p className="text-slate-550 text-sm font-semibold leading-relaxed">{notificationContent.message}</p>
                  </>
                )}
                
                {notificationContent.type === 'success' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 shadow-md">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-black text-emerald-800 mb-2">{notificationContent.title}</h3>
                    <p className="text-slate-550 text-sm font-semibold leading-relaxed mb-6">{notificationContent.message}</p>
                    <button
                      onClick={() => setShowNotificationModal(false)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      Tutup Notifikasi
                    </button>
                  </>
                )}
                
                {notificationContent.type === 'error' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 shadow-md">
                      <XCircle className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="text-lg font-black text-rose-800 mb-2">{notificationContent.title}</h3>
                    <p className="text-slate-550 text-sm font-semibold leading-relaxed mb-6">{notificationContent.message}</p>
                    <button
                      onClick={() => setShowNotificationModal(false)}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      Tutup Notifikasi
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SekretariatPaymentPage;
