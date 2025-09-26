import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Star,
  Download,
  Eye,
  MessageSquare,
  Calculator,
  ChevronDown,
  ChevronRight,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import type { User } from '../types/auth';

interface AsesorDashboardProps {
  user?: User;
  onLogout?: () => void;
}

interface AssessmentCriteria {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  components: {
    id: string;
    name: string;
    maxScore: number;
    score?: number;
    notes?: string;
  }[];
}

interface SubmissionForReview {
  id: string;
  documentType: 'LKPS' | 'LED';
  namaUniversitas: string;
  namaProgram: string;
  fileName: string;
  submittedDate: string;
  submittedBy: string;
  status: 'pending_review' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  assignedTo?: string;
  currentScore?: number;
  maxScore: number;
  assessmentId?: string;
}

const LKPS_CRITERIA: AssessmentCriteria[] = [
  {
    id: 'visi-misi',
    name: 'Visi, Misi, Tujuan dan Sasaran',
    weight: 0.1,
    maxScore: 4,
    components: [
      { id: 'vm-1', name: 'Kejelasan visi dan misi', maxScore: 4 },
      { id: 'vm-2', name: 'Kesesuaian tujuan dengan visi-misi', maxScore: 4 },
      { id: 'vm-3', name: 'Ketercapaian sasaran', maxScore: 4 }
    ]
  },
  {
    id: 'tata-pamong',
    name: 'Tata Pamong, Kepemimpinan, Sistem Pengelolaan',
    weight: 0.15,
    maxScore: 4,
    components: [
      { id: 'tp-1', name: 'Struktur organisasi dan tata pamong', maxScore: 4 },
      { id: 'tp-2', name: 'Kepemimpinan efektif', maxScore: 4 },
      { id: 'tp-3', name: 'Sistem pengelolaan fungsional', maxScore: 4 }
    ]
  },
  {
    id: 'mahasiswa',
    name: 'Mahasiswa',
    weight: 0.2,
    maxScore: 4,
    components: [
      { id: 'mhs-1', name: 'Kualitas input mahasiswa', maxScore: 4 },
      { id: 'mhs-2', name: 'Sistem pembelajaran', maxScore: 4 },
      { id: 'mhs-3', name: 'Atmosfer akademik', maxScore: 4 }
    ]
  },
  {
    id: 'sdm',
    name: 'Sumber Daya Manusia',
    weight: 0.25,
    maxScore: 4,
    components: [
      { id: 'sdm-1', name: 'Kualitas dan kualifikasi dosen', maxScore: 4 },
      { id: 'sdm-2', name: 'Rasio dosen:mahasiswa', maxScore: 4 },
      { id: 'sdm-3', name: 'Kinerja dosen', maxScore: 4 }
    ]
  },
  {
    id: 'kurikulum',
    name: 'Kurikulum, Pembelajaran, dan Suasana Akademik',
    weight: 0.3,
    maxScore: 4,
    components: [
      { id: 'kur-1', name: 'Kurikulum dan pembelajaran', maxScore: 4 },
      { id: 'kur-2', name: 'Suasana akademik', maxScore: 4 },
      { id: 'kur-3', name: 'Sistem pembelajaran', maxScore: 4 }
    ]
  }
];

export const AsesorDashboard: React.FC<AsesorDashboardProps> = ({ user, onLogout }) => {
  const [submissions, setSubmissions] = useState<SubmissionForReview[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionForReview | null>(null);
  const [assessmentCriteria, setAssessmentCriteria] = useState<AssessmentCriteria[]>(LKPS_CRITERIA);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // Mock data
  useEffect(() => {
    const mockSubmissions: SubmissionForReview[] = [
      {
        id: '1',
        documentType: 'LKPS',
        namaUniversitas: 'Universitas Indonesia',
        namaProgram: 'Teknik Informatika',
        fileName: 'LKPS_TI_2024.xlsx',
        submittedDate: '2024-09-20',
        submittedBy: 'Dr. Ahmad Rahman',
        status: 'pending_review',
        maxScore: 4,
        assignedTo: 'Prof. Dr. Bambang'
      },
      {
        id: '2',
        documentType: 'LED',
        namaUniversitas: 'Institut Teknologi Bandung',
        namaProgram: 'Sistem Informasi',
        fileName: 'LED_SI_2024.xlsx',
        submittedDate: '2024-09-22',
        submittedBy: 'Dr. Siti Nurhaliza',
        status: 'in_progress',
        maxScore: 4,
        currentScore: 3.2,
        assignedTo: 'Prof. Dr. Bambang',
        assessmentId: 'assess-1'
      }
    ];
    setSubmissions(mockSubmissions);
  }, []);

  const getStatusBadge = (status: SubmissionForReview['status']) => {
    const configs = {
      pending_review: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Pending Review' },
      in_progress: { color: 'bg-blue-100 text-blue-700', icon: MessageSquare, text: 'In Progress' },
      completed: { color: 'bg-purple-100 text-purple-700', icon: CheckCircle, text: 'Completed' },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Rejected' }
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

  const startAssessment = (submission: SubmissionForReview) => {
    setSelectedSubmission(submission);
    setShowAssessmentModal(true);
    // Initialize assessment criteria with empty scores
    const initializedCriteria = LKPS_CRITERIA.map(criteria => ({
      ...criteria,
      components: criteria.components.map(comp => ({ ...comp, score: 0, notes: '' }))
    }));
    setAssessmentCriteria(initializedCriteria);
  };

  const updateComponentScore = (criteriaId: string, componentId: string, score: number) => {
    setAssessmentCriteria(prev => 
      prev.map(criteria => 
        criteria.id === criteriaId 
          ? {
              ...criteria,
              components: criteria.components.map(comp =>
                comp.id === componentId ? { ...comp, score } : comp
              )
            }
          : criteria
      )
    );
  };

  const updateComponentNotes = (criteriaId: string, componentId: string, notes: string) => {
    setAssessmentCriteria(prev => 
      prev.map(criteria => 
        criteria.id === criteriaId 
          ? {
              ...criteria,
              components: criteria.components.map(comp =>
                comp.id === componentId ? { ...comp, notes } : comp
              )
            }
          : criteria
      )
    );
  };

  const calculateTotalScore = () => {
    let totalWeightedScore = 0;
    
    assessmentCriteria.forEach(criteria => {
      const avgScore = criteria.components.reduce((sum, comp) => sum + (comp.score || 0), 0) / criteria.components.length;
      totalWeightedScore += avgScore * criteria.weight;
    });
    
    return totalWeightedScore.toFixed(2);
  };

  const toggleCriteriaExpansion = (criteriaId: string) => {
    setExpandedCriteria(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criteriaId)) {
        newSet.delete(criteriaId);
      } else {
        newSet.add(criteriaId);
      }
      return newSet;
    });
  };

  const submitAssessment = async (status: 'approved' | 'rejected') => {
    if (!selectedSubmission) return;

    try {
      const finalScore = parseFloat(calculateTotalScore());
      
      // Update submission status
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === selectedSubmission.id 
            ? { ...sub, status, currentScore: finalScore }
            : sub
        )
      );

      setShowAssessmentModal(false);
      setSelectedSubmission(null);
      
      alert(`Assessment berhasil disimpan dengan status: ${status}`);
    } catch (error) {
      alert('Gagal menyimpan assessment');
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
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Asesor</h1>
                <p className="mt-1 text-gray-600">
                  Evaluasi dokumen LKPS dan LED Program Studi
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Assigned to: <span className="font-medium">Prof. Dr. Bambang</span>
                </div>
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
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'pending_review').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'in_progress').length}
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
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => ['completed', 'approved'].includes(s.status)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(submissions.filter(s => s.currentScore).reduce((sum, s) => sum + (s.currentScore || 0), 0) / 
                    Math.max(submissions.filter(s => s.currentScore).length, 1)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Dokumen untuk Review ({submissions.length})
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
                    Tanggal Submit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(submission.submittedDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.currentScore ? (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium">
                            {submission.currentScore.toFixed(2)}/{submission.maxScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Belum dinilai</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-900 flex items-center"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startAssessment(submission)}
                          className="text-green-600 hover:text-green-900 flex items-center"
                          title="Start Assessment"
                        >
                          <Calculator className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assessment Modal */}
      {showAssessmentModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Assessment: {selectedSubmission.documentType}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedSubmission.namaProgram} - {selectedSubmission.namaUniversitas}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-2xl font-bold text-orange-600">
                  {calculateTotalScore()}/4.0
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {assessmentCriteria.map((criteria) => (
                  <div key={criteria.id} className="bg-gray-50 rounded-lg p-4">
                    <button
                      onClick={() => toggleCriteriaExpansion(criteria.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {criteria.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Bobot: {(criteria.weight * 100)}% | Max Score: {criteria.maxScore}
                        </p>
                      </div>
                      {expandedCriteria.has(criteria.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    {expandedCriteria.has(criteria.id) && (
                      <div className="mt-4 space-y-4">
                        {criteria.components.map((component) => (
                          <div key={component.id} className="bg-white rounded-lg p-4 border">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-medium text-gray-900">
                                {component.name}
                              </h4>
                              <span className="text-sm text-gray-500">
                                Max: {component.maxScore}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {[1, 2, 3, 4].map((score) => (
                                <button
                                  key={score}
                                  onClick={() => updateComponentScore(criteria.id, component.id, score)}
                                  className={`p-2 text-center rounded border-2 transition-colors ${
                                    component.score === score
                                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                            
                            <textarea
                              placeholder="Catatan evaluasi..."
                              value={component.notes || ''}
                              onChange={(e) => updateComponentNotes(criteria.id, component.id, e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t p-6 flex-shrink-0">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowAssessmentModal(false);
                    setSelectedSubmission(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => submitAssessment('rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => submitAssessment('approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};