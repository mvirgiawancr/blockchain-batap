import { useState } from 'react';
import { ChevronDown, ChevronRight, Award, TrendingUp, AlertCircle, Info, AlertTriangle, Database, ShieldAlert } from 'lucide-react';

/**
 * Component to display detailed scoring breakdown with nested dropdowns
 * Level 1: Show 7 criteria
 * Level 2: Show butir scores for each criteria
 * Now includes score reason indicators for zero/low/default scores
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

  /**
   * Get reason label and styling for a butir score
   * Possible reasons: "calculated", "low_confidence", "not_available", "not_detected", "default"
   */
  const getReasonInfo = (reason, score) => {
    switch (reason) {
      case 'low_confidence':
        return {
          label: 'Data tipis/tidak ditemukan – skor minimum 2.0 (konfidensi rendah)',
          icon: ShieldAlert,
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          show: true
        };
      case 'not_available':
        return {
          label: 'Data tidak tersedia di LED/LKPS',
          icon: Database,
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          show: true
        };
      case 'not_detected':
        return {
          label: 'Data tidak terdeteksi oleh AI',
          icon: AlertTriangle,
          color: 'text-red-600 bg-red-50 border-red-200',
          show: true
        };
      case 'default':
      case 'calculated':
      default:
        return {
          label: 'Dihitung dari data LED/LKPS',
          icon: TrendingUp,
          color: 'text-green-600 bg-green-50 border-green-200',
          show: false
        };
    }
  };

  // Get butir details with full names (LAM-TEK 2025 - 56 Butir)
  const getButirDetails = (criteriaNumber, butirNumber) => {
    const butirNames = {
      // Kriteria 1: Diferensiasi Misi (3 butir)
      '1.1': 'Kekhasan VMTS',
      '1.2': 'Mekanisme Penyusunan VMTS',
      '1.3': 'Tingkat Pemahaman dan Pencapaian VMTS',
      
      // Kriteria 2: Akuntabilitas (11 butir)
      '2.1': 'Sistem Tata Pamong - Struktur Organisasi',
      '2.2': 'Sistem Tata Pamong - Good Governance',
      '2.3': 'Komitmen Pimpinan',
      '2.4': 'Kemampuan Manajerial',
      '2.5': 'Relevansi Kerja Sama',
      '2.6': 'Kerja Sama Aktif (3D)',
      '2.7': 'Pelaksanaan Kerja Sama',
      '2.8': 'Pengelolaan Keuangan',
      '2.9': 'BOP - Biaya Operasional Pendidikan',
      '2.10': 'DPD - Dana Penelitian DTPS',
      '2.11': 'DPkMD - Dana PkM DTPS',
      
      // Kriteria 3: Relevansi Pendidikan, Penelitian, dan PkM (13 butir)
      '3.1': 'Pemutakhiran Kurikulum',
      '3.2': 'Profil Lulusan dan CPL',
      '3.3': 'Kesesuaian dan Tinjauan CPL',
      '3.4': 'Kualitas Input Mahasiswa',
      '3.5': 'RPS - Kelengkapan',
      '3.6': 'RPS - Tinjauan Rutin',
      '3.7': 'Proses Pembelajaran',
      '3.8': 'Integrasi Penelitian dan PkM dalam Pembelajaran',
      '3.9': 'Suasana Akademik',
      '3.10': 'Penelitian - Kesesuaian dengan VMTS',
      '3.11': 'Penelitian DTPS dengan Mahasiswa',
      '3.12': 'PkM - Kesesuaian dengan VMTS',
      '3.13': 'PkM DTPS dengan Mahasiswa',
      
      // Kriteria 4: Sumber Daya Manusia (10 butir)
      '4.1': 'Kecukupan Jumlah DTPS',
      '4.2': 'Jabatan Akademik DTPS',
      '4.3': 'Tenaga Kependidikan',
      '4.4': 'RBK - Rerata Beban Kerja DTPS',
      '4.5': 'Kinerja Penelitian DTPS',
      '4.6': 'Kinerja PkM DTPS',
      '4.7': 'Publikasi Ilmiah DTPS (3D)',
      '4.8': 'Luaran Penelitian dan PkM DTPS',
      '4.9': 'PKIB - Karya Ilmiah Bereputasi',
      '4.10': 'DTPS Penulis Korespondensi',
      
      // Kriteria 5: Sarana, Prasarana, dan K3L (3 butir)
      '5.1': 'Sarana dan Prasarana Akademik',
      '5.2': 'Sarana dan Prasarana Non-Akademik',
      '5.3': 'K3L - Keselamatan Kesehatan Kerja dan Lingkungan',
      
      // Kriteria 6: Mahasiswa dan Luaran Mahasiswa (10 butir)
      '6.1': 'Persentase Mahasiswa Asing',
      '6.2': 'IPK Lulusan',
      '6.3': 'Prestasi Akademik Mahasiswa (3D)',
      '6.4': 'Masa Studi',
      '6.5': 'PTW - Persentase Kelulusan Tepat Waktu',
      '6.6': 'Publikasi Ilmiah Mahasiswa (3D)',
      '6.7': 'Luaran Penelitian dan PkM Mahasiswa',
      '6.8': 'Tracer Study',
      '6.9': 'Waktu Tunggu Lulusan',
      '6.10': 'KBK - Kesesuaian Bidang Kerja',
      
      // Kriteria 7: Sistem Penjaminan Mutu (6 butir)
      '7.1': 'Keberadaan Unit Penjaminan Mutu',
      '7.2': 'Ketersediaan Perangkat SPMI',
      '7.3': 'IKT - Indikator Kinerja Tambahan',
      '7.4': 'Keterlaksanaan SPMI dan AMI',
      '7.5': 'Evaluasi Capaian Kinerja',
      '7.6': 'Kepuasan Pemangku Kepentingan',
      
      // Kriteria 8: Program Pengembangan Berkelanjutan (3 butir - tidak dinilai)
      '8.1': 'Analisis Lingkungan dan SWOT',
      '8.2': 'Tujuan Strategis Pengembangan',
      '8.3': 'Program Pengembangan Berkelanjutan'
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
          {/* Legend */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">Keterangan Sumber Skor:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                <TrendingUp className="w-3 h-3" /> Dihitung dari data LED/LKPS
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                <ShieldAlert className="w-3 h-3" /> Konfidensi rendah – skor minimum 2.0
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                <Database className="w-3 h-3" /> Data tidak tersedia di LED/LKPS
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                <AlertTriangle className="w-3 h-3" /> Tidak terdeteksi oleh AI
              </span>
            </div>
          </div>

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
                      const reason = criteria.butirReasons ? criteria.butirReasons[butirKey] : null;
                      const reasonInfo = reason ? getReasonInfo(reason, butirScore) : null;
                      // Always show reason for low_confidence/not_available/not_detected, show default only for low scores
                      const showReason = reasonInfo && (
                        reason === 'low_confidence' ||
                        reason === 'not_available' ||
                        reason === 'not_detected' ||
                        butirScore === 0
                      );
                      
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
                                {/* Score Reason Indicator */}
                                {showReason && reasonInfo && (
                                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${reasonInfo.color}`}>
                                    <reasonInfo.icon className="w-3 h-3" />
                                    {reasonInfo.label}
                                  </div>
                                )}
                                {/* Special indicator for zero score without explicit reason */}
                                {butirScore === 0 && !showReason && (
                                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-red-600 bg-red-50 border-red-200">
                                    <AlertTriangle className="w-3 h-3" />
                                    Data tidak terdeteksi oleh AI dari dokumen LED/LKPS
                                  </div>
                                )}
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
