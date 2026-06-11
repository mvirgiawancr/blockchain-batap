import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { 
  Banknote, Clock, CheckCircle, XCircle, AlertCircle, 
  Download, Upload, FileText, Receipt, CreditCard, 
  RefreshCw, Eye, ChevronDown, ChevronRight 
} from 'lucide-react';

const UPPSPaymentPage = ({ user }) => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/sekretariat/payments/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile || !selectedPayment) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      
      const formData = new FormData();
      formData.append('proof_file', proofFile);
      formData.append('paymentMethod', paymentMethod);

      const response = await fetch(
        `${API_BASE_URL}/sekretariat/payments/${selectedPayment.paymentId || selectedPayment.id}/upload-proof`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (response.ok) {
        setShowUploadModal(false);
        setShowSuccessModal(true);
        setProofFile(null);
        setSelectedPayment(null);
        loadPayments();
        
        setTimeout(() => setShowSuccessModal(false), 3000);
      } else {
        const err = await response.json();
        alert(`Gagal mengunggah: ${err.error || err.message}`);
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Terjadi kesalahan saat mengunggah bukti pembayaran');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadInvoice = (payment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceNumber = payment.invoiceNumber || 'INV-TEMP';
    const amountStr = formatCurrency(payment.amount);
    const dueDateStr = formatDate(payment.dueDate);
    const dateStr = formatDate(payment.invoicedAt || payment.createdAt);

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@450;600;700;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 4px solid #4f46e5;
              padding-bottom: 20px;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #4f46e5;
            }
            .title {
              font-size: 28px;
              font-weight: 700;
              text-align: right;
            }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 10px;
              letter-spacing: 0.05em;
            }
            .info-box {
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              border: 1px solid #e2e8f0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .info-row:last-child {
              margin-bottom: 0;
            }
            .info-label {
              color: #64748b;
              font-weight: 600;
            }
            .info-value {
              font-weight: 700;
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              background: #f1f5f9;
              padding: 12px;
              font-weight: 700;
              text-align: left;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 16px 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .total-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 40px;
            }
            .total-box {
              background: #e0e7ff;
              border: 2px solid #c7d2fe;
              border-radius: 12px;
              padding: 20px;
              width: 300px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 18px;
              font-weight: 800;
              color: #3730a3;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              margin-top: 60px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button onclick="window.print();" style="padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
              Cetak / Simpan PDF
            </button>
          </div>
          <div class="header">
            <div>
              <div class="logo">AKRECHAIN SYSTEM</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Komite Evaluasi Akreditasi LAM-TEK</div>
            </div>
            <div>
              <div class="title">TAGIHAN / INVOICE</div>
              <div style="font-size: 14px; font-weight: 600; color: #64748b; margin-top: 4px; text-align: right;">No: ${invoiceNumber}</div>
            </div>
          </div>

          <div class="details">
            <div>
              <div class="section-title">Ditagihkan Kepada:</div>
              <div class="info-box">
                <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${payment.uppsName || 'Unit Pengelola Program Studi'}</div>
                <div style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 4px;">${payment.institution || '-'}</div>
                <div style="font-size: 14px; color: #64748b;">Program Studi: ${payment.programStudi || '-'}</div>
              </div>
            </div>
            <div>
              <div class="section-title">Rincian Tagihan:</div>
              <div class="info-box">
                <div class="info-row">
                  <div class="info-label">Tanggal Terbit</div>
                  <div class="info-value">${dateStr}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Jatuh Tempo</div>
                  <div class="info-value">${dueDateStr}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Status</div>
                  <div class="info-value" style="color: #d97706; text-transform: uppercase;">${payment.status}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section-title">Detail Item</div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%;">No.</th>
                <th style="width: 60%;">Deskripsi Pengajuan</th>
                <th style="width: 30%; text-align: right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 600;">1.</td>
                <td>
                  <div style="font-weight: 700; margin-bottom: 4px;">${payment.description || 'Biaya Akreditasi LAM-TEK'}</div>
                  <div style="font-size: 12px; color: #64748b;">Akreditasi Program Studi ${payment.programStudi || '-'} - ${payment.institution || '-'}</div>
                </td>
                <td style="text-align: right; font-weight: 700; color: #312e81;">${amountStr}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <div class="total-row">
                <span>Total Tagihan:</span>
                <span>${amountStr}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 40px; font-size: 14px; color: #475569;">
            <div style="font-weight: 700; margin-bottom: 8px;">Metode Pembayaran Resmi:</div>
            <div style="line-height: 1.6;">
              1. Transfer Bank Mandiri: <strong>123-00-0987654-3</strong> a.n. Sekretariat Keuangan LAM-TEK<br/>
              2. Transfer Bank BNI: <strong>098-765-4321</strong> a.n. KEA Akreditasi Nasional<br/>
              <em>Harap cantumkan nomor invoice <strong>${invoiceNumber}</strong> pada berita acara transfer, kemudian unggah bukti pembayaran melalui sistem.</em>
            </div>
          </div>

          <div class="footer">
            Dokumen ini diterbitkan secara otomatis oleh Sistem Akreditasi Blockchain AkreChain dan sah tanpa tanda tangan basah.<br/>
            &copy; 2025 Komite Evaluasi Akreditasi LAM-TEK. All rights reserved.
          </div>

          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusConfig = (status) => {
    const configs = {
      invoiced: { 
        bg: 'bg-amber-50/50 border-amber-200/50', 
        text: 'text-amber-800',
        badge: 'bg-amber-100/60 text-amber-900 border-amber-300/40',
        icon: Receipt, 
        label: 'Menunggu Pembayaran',
        description: 'Tagihan telah resmi diterbitkan. Harap lakukan pembayaran transfer bank sesuai nominal di bawah lalu unggah bukti transfer Anda.'
      },
      submitted: { 
        bg: 'bg-indigo-50/50 border-indigo-200/50', 
        text: 'text-indigo-800',
        badge: 'bg-indigo-100/60 text-indigo-900 border-indigo-300/40',
        icon: Clock, 
        label: 'Menunggu Verifikasi',
        description: 'Bukti transfer Anda telah berhasil diunggah. Pihak Sekretariat sedang memverifikasi transaksi pembayaran ini.'
      },
      verified: { 
        bg: 'bg-emerald-50/50 border-emerald-200/50', 
        text: 'text-emerald-800',
        badge: 'bg-emerald-100/60 text-emerald-950 border-emerald-300/40',
        icon: CheckCircle, 
        label: 'Terverifikasi',
        description: 'Pembayaran terkonfirmasi sah oleh sistem blockchain. Silakan lanjut ke pengunggahan instrumen akreditasi LED & LKPS.'
      },
      rejected: { 
        bg: 'bg-rose-50/50 border-rose-200/50', 
        text: 'text-rose-800',
        badge: 'bg-rose-100/60 text-rose-900 border-rose-300/40',
        icon: XCircle, 
        label: 'Pembayaran Ditolak',
        description: 'Bukti transfer ditolak oleh Sekretariat karena tidak sesuai. Silakan baca alasan penolakan dan unggah ulang bukti yang valid.'
      },
    };
    return configs[status] || configs.invoiced;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
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
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <Banknote className="w-8 h-8 text-indigo-600" />
                Tagihan & Pembayaran
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Kelola tagihan biaya akreditasi program studi Anda</p>
            </div>
            <button
              onClick={loadPayments}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 text-slate-600 hover:text-indigo-600 font-bold text-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {/* Info Banner */}
          <div className="relative overflow-hidden bg-gradient-to-tr from-indigo-600 via-indigo-650 to-blue-500 rounded-2xl p-6 mb-8 text-white shadow-md shadow-indigo-100">
            {/* Soft decorative blur circles */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative flex items-start gap-4 z-10">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 shadow-inner">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight mb-1">Alur Pembayaran Akreditasi</h3>
                <p className="text-indigo-50/90 text-sm font-semibold leading-relaxed max-w-4xl">
                  Setelah dokumen pengajuan dinyatakan lengkap, Sekretariat akan menerbitkan tagihan pembayaran. 
                  Lakukan transfer sesuai metode pembayaran yang tersedia, lalu unggah bukti transfer yang sah ke dalam sistem. 
                  Segera setelah pembayaran terverifikasi di ledger blockchain, Anda dapat melanjutkan proses pengunggahan dokumen instrumen LED & LKPS.
                </p>
              </div>
            </div>
          </div>

          {/* Payment List Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
              <Clock className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 font-bold text-sm">Memuat data tagihan...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Receipt className="w-8 h-8 text-slate-405" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Tagihan</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                Anda belum memiliki tagihan akreditasi saat ini. Tagihan akan diterbitkan secara otomatis oleh pihak Sekretariat setelah kelengkapan dokumen pengajuan disetujui.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {payments.map((payment) => {
                const config = getStatusConfig(payment.status);
                const StatusIcon = config.icon;

                return (
                  <div
                    key={payment.id || payment.paymentId}
                    className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-305 flex flex-col relative"
                  >
                    {/* Color accent line on top */}
                    <div className={`h-1.5 w-full ${
                      payment.status === 'invoiced' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                      payment.status === 'submitted' ? 'bg-gradient-to-r from-indigo-500 to-blue-500' : 
                      payment.status === 'verified' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 
                      'bg-gradient-to-r from-rose-500 to-red-500'
                    }`} />

                    {/* Status Bar */}
                    <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-100/80 ${config.bg}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          payment.status === 'invoiced' ? 'bg-amber-100/60 text-amber-800 border border-amber-200/30' : 
                          payment.status === 'submitted' ? 'bg-indigo-100/60 text-indigo-800 border border-indigo-200/30' : 
                          payment.status === 'verified' ? 'bg-emerald-100/60 text-emerald-800 border border-emerald-200/30' : 
                          'bg-rose-100/60 text-rose-800 border border-rose-200/30'
                        }`}>
                          <StatusIcon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <span className={`font-black text-sm tracking-tight ${config.text}`}>{config.label}</span>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Status Transaksi</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider border uppercase shadow-sm ${config.badge}`}>
                        {payment.status}
                      </span>
                    </div>

                    <div className="p-6">
                      {/* Invoice Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5 mb-5">
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Nomor Invoice</p>
                          <p className="text-xs font-black text-slate-800 font-mono tracking-tight bg-white px-2.5 py-1 rounded border border-slate-205 inline-block shadow-sm">
                            {payment.invoiceNumber || '-'}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Jumlah Tagihan</p>
                          <p className="text-lg font-black text-indigo-600 font-heading">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Tanggal Terbit</p>
                          <p className="text-sm font-bold text-slate-700">
                            {formatDate(payment.invoicedAt || payment.createdAt)}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1.5">Jatuh Tempo</p>
                          <p className={`text-sm font-bold ${
                            payment.status === 'invoiced' ? 'text-amber-700 font-black' : 'text-slate-700'
                          }`}>
                            {payment.dueDate ? formatDate(payment.dueDate) : 'Tidak ditentukan'}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-slate-50/40 border border-slate-200/40 rounded-xl p-4 mb-5 shadow-inner">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Rincian Tagihan</p>
                        <p className="text-sm text-slate-700 font-bold">{payment.description || 'Biaya Akreditasi LAM-TEK 2025'}</p>
                      </div>

                      {/* Status-specific info */}
                      <div className={`text-xs font-semibold ${config.text} ${config.bg} rounded-xl p-4 mb-5 border flex items-start gap-2.5 shadow-sm`}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{config.description}</p>
                      </div>

                      {/* Rejection reason */}
                      {payment.status === 'rejected' && payment.rejectionReason && (
                        <div className="bg-rose-50/80 border border-rose-200/60 rounded-xl p-4.5 mb-5 shadow-sm animate-fade-in">
                          <p className="text-xs font-black text-rose-800 uppercase tracking-wider mb-1.5">Alasan Penolakan dari Sekretariat:</p>
                          <p className="text-sm text-rose-700 font-bold leading-relaxed">{payment.rejectionReason}</p>
                        </div>
                      )}

                      {/* Proof info if submitted */}
                      {(payment.status === 'submitted' || payment.status === 'verified') && payment.proofFilename && (
                        <div className="bg-indigo-50/40 border border-indigo-150 rounded-xl p-4 flex items-center gap-3.5 shadow-sm animate-fade-in mb-5">
                          <div className="w-10 h-10 bg-indigo-100/60 rounded-lg flex items-center justify-center border border-indigo-200/50 shadow-inner">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">Bukti Transfer Terunggah</p>
                            <p className="text-sm font-bold text-indigo-600 truncate mt-0.5">{payment.proofFilename}</p>
                          </div>
                          {payment.paymentMethod && (
                            <span className="px-3 py-1 bg-indigo-100/80 text-indigo-800 border border-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                              {payment.paymentMethod}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 flex-wrap border-t border-slate-100 pt-5 mt-4">
                        {/* Download Invoice (always available) */}
                        <button
                          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all duration-150 font-bold text-xs cursor-pointer shadow-sm active:scale-95"
                          onClick={() => handleDownloadInvoice(payment)}
                        >
                          <Download className="w-4 h-4 text-slate-500" />
                          Unduh Tagihan (PDF)
                        </button>

                        {/* Upload Proof - only for invoiced or rejected */}
                        {(payment.status === 'invoiced' || payment.status === 'rejected') && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowUploadModal(true);
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-150 font-black text-xs cursor-pointer shadow-md hover:shadow-lg shadow-indigo-100/80 active:scale-95"
                          >
                            <Upload className="w-4 h-4" />
                            Unggah Bukti Transfer
                          </button>
                        )}

                        {/* Verified - Go to upload docs */}
                        {payment.status === 'verified' && (
                          <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-150 font-black text-xs cursor-pointer shadow-md hover:shadow-lg shadow-emerald-100/80 active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Lanjut Unggah Dokumen LED & LKPS
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Proof Modal */}
      {showUploadModal && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500" />
            <div className="p-7">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Unggah Bukti Pembayaran</h2>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6">
                Silakan isi data transfer di bawah untuk Invoice <span className="font-mono text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">{selectedPayment.invoiceNumber}</span> sebesar <span className="font-bold text-indigo-600">{formatCurrency(selectedPayment.amount)}</span>.
              </p>

              <div className="space-y-5">
                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Metode Pembayaran Asal
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm font-semibold transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <option value="Transfer Bank BNI">Transfer Bank BNI</option>
                    <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                    <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                    <option value="Transfer Bank BRI">Transfer Bank BRI</option>
                    <option value="Virtual Account">Virtual Account</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Dokumen Bukti Transfer <span className="text-rose-500 font-bold">*</span>
                  </label>
                  
                  <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-6 bg-indigo-50/10 hover:bg-indigo-50/20 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer group">
                    <input
                      type="file"
                      id="proof-upload-input"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => setProofFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-650 transition-colors mb-3 shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-850 group-hover:text-indigo-600 transition-colors">
                      Pilih file atau seret bukti transfer Anda di sini
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Mendukung format JPG, PNG, atau PDF (maks. 10MB)
                    </p>
                  </div>

                  {proofFile && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-2.5 animate-fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-800 truncate flex-1">{proofFile.name}</span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider px-2 py-0.5 bg-white border border-emerald-100 rounded-full">Ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8 border-t border-slate-100 pt-5">
                <button
                  onClick={handleUploadProof}
                  disabled={!proofFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-tr from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl disabled:from-slate-300 disabled:to-slate-400 transition-all font-black text-xs cursor-pointer shadow-md shadow-indigo-100 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Mengunggah Bukti...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Unggah & Kirim
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setProofFile(null);
                    setSelectedPayment(null);
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl transition-colors font-bold text-xs cursor-pointer border border-slate-200/40"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-150 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100/50 shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Berhasil Terunggah!</h3>
            <p className="text-slate-500 text-sm font-semibold leading-relaxed mb-5">
              Bukti pembayaran Anda telah berhasil dikirim. Komite Sekretariat akan segera memverifikasi transaksi tersebut dalam waktu dekat.
            </p>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4.5 text-left text-xs font-semibold text-emerald-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Bukti transfer terekam di sistem</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Menunggu validasi Sekretariat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Notifikasi otomatis dikirim saat terverifikasi</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UPPSPaymentPage;
