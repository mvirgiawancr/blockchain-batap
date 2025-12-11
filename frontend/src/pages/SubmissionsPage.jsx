import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { FileText, Clock, CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react';

export default function SubmissionsPage({ user }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // Extract submissions array from response data
        const data = result.data || [];
        setSubmissions(Array.isArray(data) ? data : []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'under_review': 'bg-blue-100 text-blue-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar 
        user={user} 
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole('upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Submission Saya
              </h1>
              <p className="text-gray-600 mt-1">Riwayat pengajuan akreditasi</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : !Array.isArray(submissions) || submissions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Submission</h3>
              <p className="text-gray-500 mb-6">Anda belum memiliki pengajuan akreditasi</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buat Submission Baru
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.submissionId} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {submission.programStudi}
                      </h3>
                      <p className="text-gray-600">{submission.institusi}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Submission ID</p>
                      <p className="font-mono text-sm font-semibold">{submission.submissionId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Jenjang</p>
                      <p className="font-semibold">{submission.jenjang}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tanggal Submit</p>
                      <p className="font-semibold">
                        {new Date(submission.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    {submission.ai?.scoring?.finalScore && (
                      <div>
                        <p className="text-sm text-gray-500">Skor</p>
                        <p className="font-semibold text-blue-600">
                          {submission.ai.scoring.finalScore.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {submission.ledHash && (
                      <a
                        href={`https://ipfs.io/ipfs/${submission.ledHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download LED
                      </a>
                    )}
                    {submission.lkpsHash && (
                      <a
                        href={`https://ipfs.io/ipfs/${submission.lkpsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download LKPS
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
