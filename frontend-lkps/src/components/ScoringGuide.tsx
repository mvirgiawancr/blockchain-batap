import React from 'react';
import { Info, Calculator } from 'lucide-react';

export interface ScoringMatrix {
  criteria: string;
  indicators: {
    score: number;
    description: string;
    requirements: string[];
  }[];
}

// Matriks Penilaian LKPS berdasarkan standar resmi
export const LKPS_SCORING_MATRIX: { [key: string]: ScoringMatrix } = {
  'visi-misi': {
    criteria: 'Visi, Misi, Tujuan dan Sasaran',
    indicators: [
      {
        score: 4,
        description: 'Sangat Baik',
        requirements: [
          'Visi dan misi ditetapkan dengan melibatkan pemangku kepentingan internal dan eksternal',
          'Tujuan terukur dan dapat dicapai',
          'Sasaran spesifik dan realistis',
          'Dokumen lengkap dan mudah diakses'
        ]
      },
      {
        score: 3,
        description: 'Baik',
        requirements: [
          'Visi dan misi ditetapkan dengan melibatkan sebagian pemangku kepentingan',
          'Sebagian besar tujuan terukur',
          'Sasaran cukup spesifik',
          'Dokumen tersedia namun akses terbatas'
        ]
      },
      {
        score: 2,
        description: 'Cukup',
        requirements: [
          'Visi dan misi ada namun penetapan kurang melibatkan pemangku kepentingan',
          'Beberapa tujuan dapat diukur',
          'Sasaran kurang spesifik',
          'Dokumen kurang lengkap'
        ]
      },
      {
        score: 1,
        description: 'Kurang',
        requirements: [
          'Visi dan misi tidak jelas prosedur penetapannya',
          'Tujuan sulit diukur',
          'Sasaran tidak spesifik',
          'Dokumen tidak tersedia atau sangat terbatas'
        ]
      }
    ]
  },
  'tata-pamong': {
    criteria: 'Tata Pamong, Kepemimpinan, Sistem Pengelolaan',
    indicators: [
      {
        score: 4,
        description: 'Sangat Baik',
        requirements: [
          'Struktur organisasi lengkap dengan job description yang jelas',
          'Sistem tata pamong berjalan efektif',
          'Kepemimpinan visioner dan transformatif',
          'Sistem informasi manajemen terintegrasi'
        ]
      },
      {
        score: 3,
        description: 'Baik',
        requirements: [
          'Struktur organisasi lengkap dengan job description',
          'Sistem tata pamong cukup efektif',
          'Kepemimpinan cukup visioner',
          'Sistem informasi manajemen cukup baik'
        ]
      },
      {
        score: 2,
        description: 'Cukup',
        requirements: [
          'Struktur organisasi ada namun job description kurang jelas',
          'Sistem tata pamong kurang efektif',
          'Kepemimpinan standar',
          'Sistem informasi manajemen terbatas'
        ]
      },
      {
        score: 1,
        description: 'Kurang',
        requirements: [
          'Struktur organisasi tidak jelas',
          'Sistem tata pamong tidak efektif',
          'Kepemimpinan lemah',
          'Sistem informasi manajemen tidak ada'
        ]
      }
    ]
  },
  'mahasiswa': {
    criteria: 'Mahasiswa',
    indicators: [
      {
        score: 4,
        description: 'Sangat Baik',
        requirements: [
          'Input mahasiswa berkualitas tinggi (≥ 3.0)',
          'Sistem layanan akademik sangat baik',
          'Tingkat kepuasan mahasiswa tinggi (≥ 3.5)',
          'Prestasi mahasiswa sangat baik'
        ]
      },
      {
        score: 3,
        description: 'Baik',
        requirements: [
          'Input mahasiswa cukup berkualitas (2.5 - 2.99)',
          'Sistem layanan akademik baik',
          'Tingkat kepuasan mahasiswa baik (3.0 - 3.49)',
          'Prestasi mahasiswa baik'
        ]
      },
      {
        score: 2,
        description: 'Cukup',
        requirements: [
          'Input mahasiswa standar (2.0 - 2.49)',
          'Sistem layanan akademik cukup',
          'Tingkat kepuasan mahasiswa cukup (2.5 - 2.99)',
          'Prestasi mahasiswa cukup'
        ]
      },
      {
        score: 1,
        description: 'Kurang',
        requirements: [
          'Input mahasiswa rendah (< 2.0)',
          'Sistem layanan akademik kurang',
          'Tingkat kepuasan mahasiswa rendah (< 2.5)',
          'Prestasi mahasiswa kurang'
        ]
      }
    ]
  },
  'sdm': {
    criteria: 'Sumber Daya Manusia',
    indicators: [
      {
        score: 4,
        description: 'Sangat Baik',
        requirements: [
          'Rasio dosen tetap terhadap mahasiswa sesuai standar',
          'Kualifikasi dosen: ≥ 90% S2/S3',
          'Produktivitas penelitian tinggi',
          'Rasio dosen tidak tetap maksimal 20%'
        ]
      },
      {
        score: 3,
        description: 'Baik',
        requirements: [
          'Rasio dosen tetap cukup sesuai',
          'Kualifikasi dosen: 70-89% S2/S3',
          'Produktivitas penelitian baik',
          'Rasio dosen tidak tetap 21-30%'
        ]
      },
      {
        score: 2,
        description: 'Cukup',
        requirements: [
          'Rasio dosen tetap kurang ideal',
          'Kualifikasi dosen: 50-69% S2/S3',
          'Produktivitas penelitian cukup',
          'Rasio dosen tidak tetap 31-40%'
        ]
      },
      {
        score: 1,
        description: 'Kurang',
        requirements: [
          'Rasio dosen tetap tidak mencukupi',
          'Kualifikasi dosen: < 50% S2/S3',
          'Produktivitas penelitian rendah',
          'Rasio dosen tidak tetap > 40%'
        ]
      }
    ]
  },
  'kurikulum': {
    criteria: 'Kurikulum, Pembelajaran, dan Suasana Akademik',
    indicators: [
      {
        score: 4,
        description: 'Sangat Baik',
        requirements: [
          'Kurikulum sesuai dengan SNPT dan kebutuhan stakeholder',
          'Pembelajaran berbasis kompetensi dan student-centered',
          'Suasana akademik kondusif dengan fasilitas lengkap',
          'Evaluasi pembelajaran komprehensif'
        ]
      },
      {
        score: 3,
        description: 'Baik',
        requirements: [
          'Kurikulum cukup sesuai SNPT',
          'Pembelajaran sebagian besar student-centered',
          'Suasana akademik cukup kondusif',
          'Evaluasi pembelajaran cukup baik'
        ]
      },
      {
        score: 2,
        description: 'Cukup',
        requirements: [
          'Kurikulum standar namun kurang update',
          'Pembelajaran campuran teacher dan student-centered',
          'Suasana akademik standar',
          'Evaluasi pembelajaran terbatas'
        ]
      },
      {
        score: 1,
        description: 'Kurang',
        requirements: [
          'Kurikulum tidak sesuai standar',
          'Pembelajaran masih teacher-centered',
          'Suasana akademik kurang kondusif',
          'Evaluasi pembelajaran tidak memadai'
        ]
      }
    ]
  }
};

interface ScoringGuideProps {
  criteriaId: string;
  onClose: () => void;
}

export const ScoringGuide: React.FC<ScoringGuideProps> = ({ criteriaId, onClose }) => {
  const matrix = LKPS_SCORING_MATRIX[criteriaId];

  if (!matrix) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Matriks Penilaian Tidak Ditemukan
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-orange-600" />
            Matriks Penilaian: {matrix.criteria}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {matrix.indicators.map((indicator) => (
              <div
                key={indicator.score}
                className={`border-2 rounded-lg p-4 ${
                  indicator.score === 4
                    ? 'border-green-200 bg-green-50'
                    : indicator.score === 3
                    ? 'border-blue-200 bg-blue-50'
                    : indicator.score === 2
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 ${
                        indicator.score === 4
                          ? 'bg-green-500'
                          : indicator.score === 3
                          ? 'bg-blue-500'
                          : indicator.score === 2
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    >
                      {indicator.score}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {indicator.description}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Skor: {indicator.score}/4
                      </p>
                    </div>
                  </div>
                  <Info className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Persyaratan:</h4>
                  <ul className="space-y-1">
                    {indicator.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};