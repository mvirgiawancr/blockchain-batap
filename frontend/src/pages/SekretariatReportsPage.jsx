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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(
        `${API_BASE_URL}/sekretariat/reports?range=${dateRange}`,
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(
        `${API_BASE_URL}/sekretariat/reports/download?type=${type}&range=${dateRange}`,
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('sekretariat')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <TrendingUp className="w-8 h-8 text-indigo-650" />
                Laporan & Statistik
              </h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Dashboard laporan dan analisis data akreditasi</p>
            </div>
          </div>

          {/* Date Range Selector - Premium Glass Capsule */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-650 flex-shrink-0" />
              <span className="text-sm font-bold text-slate-700">Filter Periode Laporan:</span>
            </div>
            <div className="bg-slate-100/80 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200/20 shadow-inner-sm w-fit">
              {['week', 'month', 'quarter', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    dateRange === range
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-250'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {range === 'week' ? 'Minggu Ini' : range === 'month' ? 'Bulan Ini' : range === 'quarter' ? 'Kuartal Ini' : 'Tahun Ini'}
                </button>
              ))}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center justify-between border-l-4 border-l-indigo-650 hover:-translate-y-0.5 transition-all duration-200">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Total Submission</p>
                <p className="text-3xl font-black text-slate-950 mt-1">{statistics.totalSubmissions}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-250/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-indigo-650" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-600 hover:-translate-y-0.5 transition-all duration-200">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Disetujui</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{statistics.approved}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-250/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500 hover:-translate-y-0.5 transition-all duration-200">
              <div>
                <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Pending</p>
                <p className="text-3xl font-black text-amber-700 mt-1">{statistics.pending}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 border border-amber-250/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <PieChart className="w-6 h-6 text-amber-550" />
              </div>
            </div>
          </div>

          {/* Download Reports */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Unduh Dokumen Laporan Resmi</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => downloadReport('submissions')}
                className="group flex items-center gap-4 p-6 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-250 hover:-translate-y-0.5 cursor-pointer text-left w-full relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-150/30 rounded-xl flex items-center justify-center text-indigo-650 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base">Laporan Submission</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Rincian data lengkap pengisian dokumen akreditasi</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors ml-auto flex-shrink-0" />
              </button>

              <button
                onClick={() => downloadReport('payments')}
                className="group flex items-center gap-4 p-6 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-250 hover:-translate-y-0.5 cursor-pointer text-left w-full relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-150/30 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base">Laporan Pembayaran</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Riwayat pembayaran, bukti transfer & verifikasi keuangan</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors ml-auto flex-shrink-0" />
              </button>

              <button
                onClick={() => downloadReport('upps')}
                className="group flex items-center gap-4 p-6 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-250 hover:-translate-y-0.5 cursor-pointer text-left w-full relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-purple-50 border border-purple-150/30 rounded-xl flex items-center justify-center text-purple-650 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <PieChart className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base">Laporan Unit Pengelola (UPPS)</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Data detail UPPS, program studi, dan sebaran institusi</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors ml-auto flex-shrink-0" />
              </button>

              <button
                onClick={() => downloadReport('comprehensive')}
                className="group flex items-center gap-4 p-6 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-250 hover:-translate-y-0.5 cursor-pointer text-left w-full relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-amber-50 border border-amber-150/30 rounded-xl flex items-center justify-center text-amber-550 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base">Laporan Komprehensif</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Gabungan seluruh data statistik akreditasi terintegrasi</p>
                </div>
                <Download className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors ml-auto flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SekretariatReportsPage;
