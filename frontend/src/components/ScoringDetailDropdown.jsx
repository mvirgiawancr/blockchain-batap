import { useState } from 'react';
import { ChevronDown, ChevronRight, Award, TrendingUp, AlertCircle } from 'lucide-react';

/**
 * Component to display detailed scoring breakdown with nested dropdowns
 * Level 1: Show 7 criteria
 * Level 2: Show butir scores for each criteria
 */
export default function ScoringDetailDropdown({ scoring }) {
  const [expandedCriteria, setExpandedCriteria] = useState(new Set());
  const [showAllCriteria, setShowAllCriteria] = useState(false);

  if (!scoring || !scoring.criteriaScores) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p>Data scoring tidak tersedia</p>
      </div>
    );
  }

  const toggleCriteria = (criteriaNumber) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(criteriaNumber)) {
      newExpanded.delete(criteriaNumber);
    } else {
      newExpanded.add(criteriaNumber);
    }
    setExpandedCriteria(newExpanded);
  };

  const getScoreColor = (score) => {
    if (score >= 3.5) return 'text-green-600 bg-green-50';
    if (score >= 3.0) return 'text-blue-600 bg-blue-50';
    if (score >= 2.0) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 3.5) return 'bg-green-600';
    if (score >= 3.0) return 'bg-blue-600';
    if (score >= 2.0) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  // Get butir details with full names
  const getButirDetails = (criteriaNumber, butirNumber) => {
    const butirNames = {
      // Kriteria 1: DM - Diferensiasi Misi
      '1.1': 'Keterlibatan Sivitas Akademika dalam Penyusunan Dokumen Visi, Misi, Tujuan',
      '1.2': 'Keunikan/Keunggulan PS Berbasis Riset dan Pengembangan IPTEKS',
      '1.3': 'Keunikan/Keunggulan PS Berbasis Pengembangan Wilayah/Masyarakat',
      '1.4': 'Sistem Pemantauan Pengembangan Visi, Misi, Tujuan dan Strategi',
      
      // Kriteria 2: AK - Akuntabilitas
      '2.1': 'Ketersediaan dan Pelaksanaan Sistem Penjaminan Mutu',
      '2.2': 'Ketersediaan dan Pelaksanaan Sistem Audit Internal',
      '2.3': 'Total Dana PS dalam Milyar Rupiah (BOP)',
      '2.4': 'Total Dana Penelitian dan PkM PS dalam Juta Rupiah (DPD)',
      '2.5': 'Publikasi Hasil Pelaksanaan Tridharma PT',
      
      // Kriteria 3: REL - Relevansi Pendidikan, Penelitian, dan PkM
      '3.1': 'Kurikulum Terbarukan dan Pemutakhiran Kurikulum',
      '3.2': 'Penilaian Kepuasan Mahasiswa terhadap Proses Pembelajaran',
      '3.3': 'Relevansi Capaian Pembelajaran dengan Visi, Misi PS',
      '3.4': 'Persentase Dosen dengan Jabatan Fungsional Guru Besar/Profesor',
      '3.5': 'Penelitian DTPS Sesuai Roadmap dan Berdampak ke Pembelajaran',
      '3.6': 'PkM DTPS Relevan dengan PS dan Berdampak pada Masyarakat',
      '3.7': 'Integrasi Kegiatan Penelitian dan PkM dengan Pembelajaran',
      
      // Kriteria 4: SDM - Sumber Daya Manusia
      '4.1': 'Dosen Tetap dengan Kualifikasi S3 dan Guru Besar',
      '4.2': 'Persentase Dosen Tidak Tetap terhadap Total Dosen',
      '4.3': 'Rasio Mahasiswa terhadap Dosen (RMD)',
      '4.4': 'Rekognisi Dosen (Prestasi, Penghargaan, Sertifikasi)',
      '4.5': 'Pengembangan dan Peningkatan Kompetensi Dosen',
      '4.6': 'Publikasi Ilmiah DTPS (Jurnal Internasional dan Nasional)',
      
      // Kriteria 5: SARPRAS - Sarana, Prasarana, dan K3L
      '5.1': 'Ketersediaan, Akses, dan Pemanfaatan Sarana dan Prasarana',
      '5.2': 'Kepemilikan, Akses dan Penggunaan Perpustakaan',
      '5.3': 'Sistem Pengelolaan K3L (Kesehatan, Keselamatan Kerja, Lingkungan)',
      
      // Kriteria 6: MHS - Mahasiswa dan Luaran Mahasiswa
      '6.1': 'Sistem Rekrutmen, Seleksi, dan Penerimaan Mahasiswa Baru',
      '6.2': 'Persentase Mahasiswa Asing (PMA)',
      '6.3': 'Layanan Konseling dan Bimbingan kepada Mahasiswa',
      '6.4': 'Waktu Tunggu Lulusan Mendapat Pekerjaan Pertama',
      '6.5': 'Kesesuaian Bidang Kerja Lulusan dengan Bidang Studi',
      '6.6': 'Tingkat Kepuasan Pengguna Lulusan',
      '6.7': 'Publikasi Ilmiah Mahasiswa',
      '6.8': 'Prestasi Mahasiswa (Kompetisi, Penghargaan)',
      '6.9': 'Tingkat Tempat Kerja Lulusan',
      
      // Kriteria 7: SPM - Sistem Penjaminan Mutu
      '7.1': 'Standar Mutu dan Implementasi SPMI',
      '7.2': 'Kepemimpinan dan Kemampuan Manajerial Pimpinan PS',
      '7.3': 'Kerjasama dengan Institusi Lain',
      '7.4': 'Umpan Balik dari Alumni dan Pengguna Lulusan',
      '7.5': 'Kepuasan Mahasiswa terhadap Layanan Program Studi'
    };

    return butirNames[`${criteriaNumber}.${butirNumber}`] || `Butir ${criteriaNumber}.${butirNumber}`;
  };

  const criteriaArray = Object.values(scoring.criteriaScores).sort((a, b) => a.criteriaNumber - b.criteriaNumber);

  return (
    <div className="space-y-4">
      {/* Main Dropdown Button */}
      <button
        onClick={() => setShowAllCriteria(!showAllCriteria)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
      >
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6" />
          <span className="font-bold text-lg">Lihat Rincian Skor Detail (7 Kriteria)</span>
        </div>
        {showAllCriteria ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <ChevronRight className="w-6 h-6" />
        )}
      </button>

      {/* Criteria List */}
      {showAllCriteria && (
        <div className="space-y-3 animate-fade-in">
          {criteriaArray.map((criteria) => (
            <div
              key={criteria.criteriaNumber}
              className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-all"
            >
              {/* Criteria Header - Clickable */}
              <button
                onClick={() => toggleCriteria(criteria.criteriaNumber)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${getScoreBadgeColor(criteria.averageScore)}`}>
                    {criteria.criteriaNumber}
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-lg">
                        {criteria.criteriaCode}
                      </span>
                      <span className="text-gray-700 font-medium">
                        {criteria.criteriaName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-600">
                        {criteria.butirCount} butir penilaian
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(criteria.averageScore)}`}>
                        Skor: {criteria.totalScore.toFixed(2)} / {criteria.maxPossibleScore}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${
                      criteria.averageScore >= 3.5 ? 'text-green-600' :
                      criteria.averageScore >= 3.0 ? 'text-blue-600' :
                      criteria.averageScore >= 2.0 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {criteria.averageScore.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">/ 4.00</div>
                  </div>
                </div>
                <div className="ml-4">
                  {expandedCriteria.has(criteria.criteriaNumber) ? (
                    <ChevronDown className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Butir List - Nested Dropdown */}
              {expandedCriteria.has(criteria.criteriaNumber) && (
                <div className="bg-gray-50 border-t-2 border-gray-200 px-6 py-4 animate-fade-in">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h5 className="font-bold text-gray-800">Detail Skor per Butir:</h5>
                    </div>
                    
                    {Object.entries(criteria.butirScores).map(([butirKey, butirScore]) => {
                      const butirNumber = butirKey.split('.')[1];
                      const butirName = getButirDetails(criteria.criteriaNumber, butirNumber);
                      
                      return (
                        <div
                          key={butirKey}
                          className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${getScoreBadgeColor(butirScore)}`}>
                                {butirKey}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {butirName}
                                </p>
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      butirScore >= 3.5 ? 'bg-green-500' :
                                      butirScore >= 3.0 ? 'bg-blue-500' :
                                      butirScore >= 2.0 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${(butirScore / 4) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-2xl font-bold ${
                                butirScore >= 3.5 ? 'text-green-600' :
                                butirScore >= 3.0 ? 'text-blue-600' :
                                butirScore >= 2.0 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {butirScore.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">/ 4.00</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Criteria Summary */}
                  <div className="mt-4 pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">Total Skor Kriteria {criteria.criteriaNumber}:</span>
                      <span className="font-bold text-blue-600">
                        {criteria.totalScore.toFixed(2)} / {criteria.maxPossibleScore}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
