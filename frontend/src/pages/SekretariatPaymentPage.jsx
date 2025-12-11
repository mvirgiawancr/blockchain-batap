import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Banknote, Search, CheckCircle, XCircle, Clock, Eye, Download, DollarSign } from 'lucide-react';

const SekretariatPaymentPage = ({ user }) => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [verifying, setVerifying] = useState(false);

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
          p.submissionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.uppsName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  }, [searchQuery, statusFilter, payments]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/sekretariat/payments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const handleVerifyPayment = async (paymentId, decision) => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/v1/sekretariat/payments/${paymentId}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ decision }),
        }
      );

      if (response.ok) {
        alert(`Pembayaran ${decision === 'approve' ? 'disetujui' : 'ditolak'}`);
        setSelectedPayment(null);
        loadPayments();
      } else {
        alert('Gagal memverifikasi pembayaran');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Terjadi kesalahan');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      verified: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('sekretariat')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Banknote className="w-8 h-8 text-blue-600" />
              Verifikasi Pembayaran
            </h1>
            <p className="text-gray-600">Kelola dan verifikasi bukti pembayaran dari UPPS</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan submission ID atau nama UPPS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Payments List */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {payment.uppsName || 'UPPS'}
                      </h3>
                      <p className="text-sm text-gray-600">ID: {payment.submissionId}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-gray-700">
                        Rp {payment.amount?.toLocaleString('id-ID') || '0'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Tanggal:</strong>{' '}
                      {new Date(payment.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedPayment(payment)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Verifikasi
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Verification Modal */}
          {selectedPayment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Verifikasi Pembayaran
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Submission ID</p>
                      <p className="font-semibold text-gray-900">{selectedPayment.submissionId}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">Nama UPPS</p>
                      <p className="font-semibold text-gray-900">{selectedPayment.uppsName || '-'}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Jumlah Pembayaran</p>
                        <p className="text-2xl font-bold text-green-600">
                          Rp {selectedPayment.amount?.toLocaleString('id-ID') || '0'}
                        </p>
                      </div>
                    </div>
                    {selectedPayment.proofUrl && (
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-2">Bukti Pembayaran</p>
                        <a
                          href={selectedPayment.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          <Download className="w-4 h-4" />
                          Lihat Bukti
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleVerifyPayment(selectedPayment.id, 'approve')}
                      disabled={verifying}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Verifikasi
                    </button>
                    <button
                      onClick={() => handleVerifyPayment(selectedPayment.id, 'reject')}
                      disabled={verifying}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Tolak
                    </button>
                    <button
                      onClick={() => setSelectedPayment(null)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SekretariatPaymentPage;
