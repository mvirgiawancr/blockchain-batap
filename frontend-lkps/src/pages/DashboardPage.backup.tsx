import React, { useState } from 'react';
import { Upload, FileText, Plus, Eye, Download, LogOut, User } from 'lucide-react';
import { ExcelUpload } from '../components/ExcelUpload';
import type { User as UserType } from '../types/auth';
import type { ParsedExcelFile } from '../types/lkps';

interface DashboardPageProps {
  user: UserType;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ParsedExcelFile[]>([]);

  const handleFileUploaded = (parsedFile: ParsedExcelFile) => {
    // Set metadata
    parsedFile.lkpsData.metadata = {
      ...parsedFile.lkpsData.metadata!,
      uploadedBy: user.username,
      fileName: parsedFile.fileName,
      fileSize: parsedFile.fileSize
    };
    
    setUploadedFiles(prev => [...prev, parsedFile]);
    setShowUploadModal(false);
    
    // TODO: Save to backend/CouchDB
    console.log('File uploaded:', parsedFile);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'UniversityAdmin': return 'UPPS';
      case 'Assessor': return 'Asesor';
      case 'SuperAdmin': return 'Admin';
      default: return role;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-orange-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7V17L12 22L22 17V7L12 2Z" />
              </svg>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sistem Akreditasi LKPS</h1>
                <p className="text-sm text-gray-600">Blockchain-based Accreditation System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span className="font-medium">{user.username}</span>
                <span className="mx-2">•</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Selamat Datang, {user.username}!
          </h2>
          <p className="text-gray-600">
            Kelola data LKPS Anda dengan mudah menggunakan sistem blockchain yang aman dan terpercaya.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md mr-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">{uploadedFiles.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md mr-4">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Berhasil Diproses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {uploadedFiles.filter(f => f.errors.length === 0).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-md mr-4">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Perlu Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {uploadedFiles.filter(f => f.errors.length > 0 || f.warnings.length > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Data LKPS</h3>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload File LKPS
          </button>
        </div>

        {/* Files List */}
        <div className="bg-white rounded-lg shadow-sm border">
          {uploadedFiles.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada file LKPS</h3>
              <p className="text-gray-600 mb-4">
                Upload file Excel LKPS pertama Anda untuk memulai proses akreditasi
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors mx-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File LKPS
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program Studi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Upload
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadedFiles.map((file, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-8 w-8 text-blue-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{file.fileName}</div>
                            <div className="text-sm text-gray-500">{formatFileSize(file.fileSize)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {file.lkpsData.namaProgram || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {file.lkpsData.jenjangnProgram || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          file.errors.length > 0 
                            ? 'bg-red-100 text-red-800' 
                            : file.warnings.length > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {file.errors.length > 0 
                            ? `${file.errors.length} Error${file.errors.length > 1 ? 's' : ''}`
                            : file.warnings.length > 0
                            ? `${file.warnings.length} Warning${file.warnings.length > 1 ? 's' : ''}`
                            : 'Valid'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.lkpsData.metadata?.uploadDate ? formatDate(file.lkpsData.metadata.uploadDate) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button className="text-green-600 hover:text-green-900 flex items-center">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ExcelUpload
          onFileUploaded={handleFileUploaded}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};