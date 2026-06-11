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
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 text-center border border-slate-200 text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-semibold">Data scoring tidak tersedia</p>
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
    if (score >= 3.5) return 'text-emerald-705 bg-emerald-50 border-emerald-100';
    if (score >= 3.0) return 'text-indigo-705 bg-indigo-50 border-indigo-100';
    if (score >= 2.0) return 'text-amber-705 bg-amber-50 border-amber-100';
    return 'text-rose-705 bg-rose-50 border-rose-100';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 3.5) return 'bg-gradient-to-br from-emerald-500 to-teal-500';
    if (score >= 3.0) return 'bg-gradient-to-br from-indigo-500 to-blue-500';
    if (score >= 2.0) return 'bg-gradient-to-br from-amber-400 to-orange-500';
    return 'bg-gradient-to-br from-rose-500 to-red-500';
  };

  /**
   * Get reason label and styling for a butir score
   */
  const getReasonInfo = (reason, score) => {
    switch (reason) {
      case 'low_confidence':
        return {
          label: 'Data minim / tidak utuh – skor minimum 2.00 (konfidensi rendah)',
          icon: ShieldAlert,
          color: 'text-amber-800 bg-amber-50 border-amber-100',
          show: true
        };
      case 'not_available':
        return {
          label: 'Data tidak ditemukan di lampiran LED/LKPS',
          icon: Database,
          color: 'text-orange-700 bg-orange-50 border-orange-100',
          show: true
        };
      case 'not_detected':
        return {
          label: 'Data gagal terdeteksi oleh AI',
          icon: AlertTriangle,
          color: 'text-rose-700 bg-rose-50 border-rose-100',
          show: true
        };
      case 'default':
      case 'calculated':
      default:
        return {
          label: 'Dihitung valid dari data LED/LKPS',
          icon: TrendingUp,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
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
        className="w-full flex items-center justify-between px-6 py-4.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl hover:from-indigo-750 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg shadow-indigo-100/80 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-white/90" />
          <span className="font-black text-sm tracking-wide uppercase">Lihat Rincian Skor Detail (7 Kriteria)</span>
        </div>
        {showAllCriteria ? (
          <ChevronDown className="w-5 h-5 text-white/90" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white/90" />
        )}
      </button>

      {/* Criteria List */}
      {showAllCriteria && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Legend */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Keterangan Sumber Penilaian AI:</p>
            <div className="flex flex-wrap gap-2.5 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100">
                <TrendingUp className="w-3 h-3" /> Terhitung Valid dari LED/LKPS
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-100">
                <ShieldAlert className="w-3 h-3" /> Konfidensi Rendah (Skor Min 2.00)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-850 rounded-full border border-orange-100">
                <Database className="w-3 h-3" /> Data Tidak Tersedia
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 rounded-full border border-rose-100">
                <AlertTriangle className="w-3 h-3" /> Gagal Terdeteksi AI
              </span>
            </div>
          </div>

          {criteriaArray.map((criteria) => (
            <div
              key={criteria.criteriaNumber}
              className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 overflow-hidden hover:border-indigo-300/80 transition-all duration-200 shadow-sm"
            >
              {/* Criteria Header - Clickable */}
              <button
                onClick={() => toggleCriteria(criteria.criteriaNumber)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-white shadow-sm flex-shrink-0 ${getScoreBadgeColor(criteria.averageScore)}`}>
                    {criteria.criteriaNumber}
                  </div>
                  <div className="text-left flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-800 font-mono tracking-tight text-sm px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {criteria.criteriaCode}
                      </span>
                      <span className="text-slate-800 font-extrabold text-sm truncate max-w-xs md:max-w-md">
                        {criteria.criteriaName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {criteria.butirCount} butir penilaian
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${getScoreColor(criteria.averageScore)}`}>
                        Total: {criteria.totalScore.toFixed(2)} / {criteria.maxPossibleScore}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pr-2">
                    <div className={`text-2xl font-black font-heading ${
                      criteria.averageScore >= 3.5 ? 'text-emerald-600' :
                      criteria.averageScore >= 3.0 ? 'text-indigo-600' :
                      criteria.averageScore >= 2.0 ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {criteria.averageScore.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-400 font-black tracking-wider uppercase">/ 4.00</div>
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {expandedCriteria.has(criteria.criteriaNumber) ? (
                    <ChevronDown className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Butir List - Nested Dropdown */}
              {expandedCriteria.has(criteria.criteriaNumber) && (
                <div className="bg-slate-50/40 border-t border-slate-100 px-6 py-4.5 animate-fade-in pl-8">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <h5 className="font-black text-xs text-slate-700 uppercase tracking-wider">Detail Skor per Butir Evaluasi:</h5>
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
                          className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-slate-200/40 hover:border-indigo-200/65 transition-all shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-black font-mono text-xs flex-shrink-0 shadow-sm ${getScoreBadgeColor(butirScore)}`}>
                                {butirKey}
                              </span>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="font-bold text-slate-800 text-sm leading-snug truncate">
                                  {butirName}
                                </p>
                                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 border border-slate-200/30">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                      butirScore >= 3.5 ? 'bg-emerald-500' :
                                      butirScore >= 3.0 ? 'bg-indigo-500' :
                                      butirScore >= 2.0 ? 'bg-amber-500' :
                                      'bg-rose-500'
                                    }`}
                                    style={{ width: `${(butirScore / 4) * 100}%` }}
                                  />
                                </div>
                                {/* Score Reason Indicator */}
                                {showReason && reasonInfo && (
                                  <div className={`mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${reasonInfo.color}`}>
                                    <reasonInfo.icon className="w-3 h-3" />
                                    {reasonInfo.label}
                                  </div>
                                )}
                                {/* Special indicator for zero score without explicit reason */}
                                {butirScore === 0 && !showReason && (
                                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black border text-rose-800 bg-rose-50 border-rose-100 uppercase tracking-wider animate-pulse">
                                    <AlertTriangle className="w-3 h-3" />
                                    Data tidak terdeteksi oleh AI
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`text-xl font-black font-heading ${
                                butirScore >= 3.5 ? 'text-emerald-600' :
                                butirScore >= 3.0 ? 'text-indigo-600' :
                                butirScore >= 2.0 ? 'text-amber-600' :
                                'text-rose-600'
                              }`}>
                                {butirScore.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-slate-400 font-black tracking-wider uppercase">/ 4.00</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Criteria Summary */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Total Nilai Akumulasi Kriteria {criteria.criteriaNumber}:</span>
                    <span className="font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
                      {criteria.totalScore.toFixed(2)} / {criteria.maxPossibleScore}
                    </span>
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
