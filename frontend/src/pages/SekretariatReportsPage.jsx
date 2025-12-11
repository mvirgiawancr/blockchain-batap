import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { TrendingUp, Download, FileText, BarChart3, PieChart, Calendar } from 'lucide-react';

const SekretariatReportsPage = ({ user }) => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState({
    totalSubmissions: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalUPPS: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/v1/sekretariat/reports?range=${dateRange}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/v1/sekretariat/reports/download?type=${type}&range=${dateRange}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${type}-${dateRange}.pdf`;
        a.click();
      } else {
        alert('Gagal mengunduh laporan');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Terjadi kesalahan saat mengunduh');
    }
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
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Laporan & Statistik
            </h1>
            <p className="text-gray-600">Dashboard laporan dan analisis data akreditasi</p>
          </div>

          {/* Date Range Selector */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Periode:</span>
              <div className="flex gap-2">
                {['week', 'month', 'quarter', 'year'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      dateRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {range === 'week' ? 'Minggu Ini' : range === 'month' ? 'Bulan Ini' : range === 'quarter' ? 'Kuartal Ini' : 'Tahun Ini'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-gray-600 text-sm font-semibold mb-1">Total Submission</h3>
              <p className="text-3xl font-bold text-gray-900">{statistics.totalSubmissions}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-gray-600 text-sm font-semibold mb-1">Disetujui</h3>
              <p className="text-3xl font-bold text-green-600">{statistics.approved}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-yellow-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-gray-600 text-sm font-semibold mb-1">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">{statistics.pending}</p>
            </div>
          </div>

          {/* Download Reports */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Unduh Laporan</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => downloadReport('submissions')}
                className="flex items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-bold text-gray-900">Laporan Submission</h3>
                  <p className="text-sm text-gray-600">Data lengkap submission akreditasi</p>
                </div>
                <Download className="w-5 h-5 text-gray-400 ml-auto" />
              </button>

              <button
                onClick={() => downloadReport('payments')}
                className="flex items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <BarChart3 className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <h3 className="font-bold text-gray-900">Laporan Pembayaran</h3>
                  <p className="text-sm text-gray-600">Riwayat pembayaran dan verifikasi</p>
                </div>
                <Download className="w-5 h-5 text-gray-400 ml-auto" />
              </button>

              <button
                onClick={() => downloadReport('upps')}
                className="flex items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <PieChart className="w-8 h-8 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-bold text-gray-900">Laporan UPPS</h3>
                  <p className="text-sm text-gray-600">Data UPPS dan institusi</p>
                </div>
                <Download className="w-5 h-5 text-gray-400 ml-auto" />
              </button>

              <button
                onClick={() => downloadReport('comprehensive')}
                className="flex items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all"
              >
                <TrendingUp className="w-8 h-8 text-orange-600" />
                <div className="text-left">
                  <h3 className="font-bold text-gray-900">Laporan Komprehensif</h3>
                  <p className="text-sm text-gray-600">Seluruh data dan statistik</p>
                </div>
                <Download className="w-5 h-5 text-gray-400 ml-auto" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SekretariatReportsPage;
