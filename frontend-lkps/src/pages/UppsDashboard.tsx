import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Search,
  Calendar,
  Download,
  Eye,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { ExcelUpload } from '../components/ExcelUpload';
import type { ParsedExcelFile } from '../types/lkps';
import type { User } from '../types/auth';

interface UppsDashboardProps {
  user?: User;
  onLogout?: () => void;
}

interface Submission {
  id: string;
  documentType: 'LKPS' | 'LED';
  namaUniversitas: string;
  namaProgram: string;
  fileName: string;
  uploadDate: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  version: number;
  submittedBy: string;
}

export const UppsDashboard: React.FC<UppsDashboardProps> = ({ user, onLogout }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'LKPS' | 'LED'>('LKPS');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Mock data - dalam implementasi nyata ini dari API
  useEffect(() => {
    const mockSubmissions: Submission[] = [
      {
        id: '1',
        documentType: 'LKPS',
        namaUniversitas: 'Universitas Indonesia',
        namaProgram: 'Teknik Informatika',
        fileName: 'LKPS_TI_2024.xlsx',
        uploadDate: '2024-09-20',
        status: 'approved',
        version: 2,
        submittedBy: 'Dr. Ahmad Rahman'
      },
      {
        id: '2',
        documentType: 'LED',
        namaUniversitas: 'Universitas Indonesia',
        namaProgram: 'Teknik Informatika',
        fileName: 'LED_TI_2024.xlsx',
        uploadDate: '2024-09-25',
        status: 'under_review',
        version: 1,
        submittedBy: 'Dr. Ahmad Rahman'
      }
    ];
    setSubmissions(mockSubmissions);
  }, []);

  const handleFileUploaded = async (data: ParsedExcelFile) => {
    try {
      // Simulasi API call untuk save data
      const newSubmission: Submission = {
        id: Date.now().toString(),
        documentType: uploadType,
        namaUniversitas: data.lkpsData.namaUniversitas || 'Unknown University',
        namaProgram: data.lkpsData.namaProgram || 'Unknown Program',
        fileName: `${uploadType}_${Date.now()}.xlsx`,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'draft',
        version: 1,
        submittedBy: 'Current User'
      };

      setSubmissions(prev => [newSubmission, ...prev]);
      setShowUploadModal(false);
      
      alert(`${uploadType} berhasil diupload dan disimpan sebagai draft!`);
    } catch (error) {
      console.error('Error saving submission:', error);
      alert('Gagal menyimpan data. Silakan coba lagi.');
    }
  };

  const getStatusBadge = (status: Submission['status']) => {
    const configs = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: Clock, text: 'Draft' },
      submitted: { color: 'bg-blue-100 text-blue-700', icon: Upload, text: 'Submitted' },
      under_review: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, text: 'Under Review' },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, text: 'Rejected' }
    };

    const config = configs[status];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.namaProgram.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.namaUniversitas.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    const matchesType = typeFilter === 'all' || submission.documentType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const submitDocument = async (id: string) => {
    try {
      // Simulasi API call
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === id ? { ...sub, status: 'submitted' } : sub
        )
      );
      alert('Dokumen berhasil disubmit untuk review!');
    } catch (error) {
      alert('Gagal submit dokumen. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard UPPS</h1>
                <p className="mt-1 text-gray-600">
                  Kelola dokumen LKPS dan LED Program Studi
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setUploadType('LKPS');
                    setShowUploadModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload LKPS
                </button>
                <button
                  onClick={() => {
                    setUploadType('LED');
                    setShowUploadModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload LED
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'under_review').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'draft').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan program studi, universitas, atau nama file..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 rounded-md"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="LKPS">LKPS</option>
                  <option value="LED">LED</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 rounded-md"
                >
                  <option value="all">Semua Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Dokumen Submissions ({filteredSubmissions.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dokumen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program Studi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Upload
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            submission.documentType === 'LKPS' 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.documentType}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.fileName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.namaProgram}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.namaUniversitas}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(submission.uploadDate).toLocaleDateString('id-ID')}
                      </div>
                      <div className="text-sm text-gray-500">
                        v{submission.version}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-orange-600 hover:text-orange-900 flex items-center"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {submission.status === 'draft' && (
                          <button
                            onClick={() => submitDocument(submission.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Submit untuk Review"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Tidak ada dokumen
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Tidak ada dokumen yang cocok dengan filter'
                  : 'Mulai dengan mengupload dokumen LKPS atau LED pertama Anda'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ExcelUpload
          documentType={uploadType}
          onFileUploaded={handleFileUploaded}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};