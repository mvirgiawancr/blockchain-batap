import React from 'react';
import { TrendingUp, Award, Star } from 'lucide-react';

const ScoringResultDisplay = ({ scoringResult }) => {
  if (!scoringResult) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed border-slate-200 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
          <Star className="w-8 h-8 text-slate-300" />
          <p className="text-sm font-semibold">Belum ada hasil skoring tersedia</p>
        </div>
      </div>
    );
  }

  const { 
    overall_percentage,
    overallScore,
    percentage,
    grade,
    method,
    akreditasi,
    criteriaScores,
    summary
  } = scoringResult;

  // Support both old and new data structure
  const finalPercentage = percentage || overall_percentage || 0;
  const finalScore = overallScore || (finalPercentage / 100 * 4) || 0;
  const finalGrade = grade || "E";
  const finalMethod = method || "LAM-TEK 2025";
  const finalAkreditasi = akreditasi || (
    finalGrade === 'A' ? 'Unggul' :
    finalGrade === 'B' ? 'Baik Sekali' :
    finalGrade === 'C' ? 'Baik' :
    finalGrade === 'D' ? 'Minimum' : 'Tidak Terakreditasi'
  );
  
  // Use overallScore directly (0-4 scale)
  const scoreOn4Scale = (finalScore || 0).toFixed(2);
  
  // Determine grade color
  const getGradeColor = (grade) => {
    switch (grade?.toUpperCase()) {
      case 'A': return 'from-emerald-500 to-green-600 text-emerald-700';
      case 'B': return 'from-blue-500 to-indigo-600 text-blue-700';
      case 'C': return 'from-yellow-500 to-orange-500 text-yellow-700';
      case 'D': return 'from-orange-500 to-red-500 text-orange-700';
      default: return 'from-gray-500 to-gray-600 text-gray-700';
    }
  };

  const gradeColor = getGradeColor(finalGrade);

  return (
    <div className="bg-gradient-to-tr from-indigo-50/70 via-indigo-50/30 to-blue-50/20 rounded-2xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
      {/* Decorative background overlay */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 z-10">
        <div className="flex items-center gap-4">
          <div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight">Hasil Skoring Otomatis AI</h4>
            <p className="text-indigo-600 text-xs font-extrabold uppercase tracking-wider mt-0.5">Metodologi: {finalMethod}</p>
          </div>
        </div>
        
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-slate-200/60 text-center min-w-28">
            <div className="text-3xl font-black text-indigo-600 font-heading">{scoreOn4Scale}</div>
            <div className="text-[10px] text-slate-400 font-black tracking-wider uppercase mt-0.5">/ 4.00</div>
          </div>
          <div className="text-left">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Predikat Awal</p>
            <p className={`text-base font-black ${
              finalGrade === 'A' ? 'text-emerald-700' :
              finalGrade === 'B' ? 'text-indigo-750' :
              finalGrade === 'C' ? 'text-amber-700' :
              'text-rose-700'
            }`}>
              {finalAkreditasi}
            </p>
          </div>
        </div>
      </div>
      
      {/* Summary Stats */}
      {summary && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-3 border border-slate-200/50 text-center shadow-sm">
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Total Butir</div>
            <div className="text-xl font-black text-slate-800 font-heading">{summary.totalButir || 0}</div>
          </div>
          <div className="bg-emerald-50/70 backdrop-blur-md rounded-xl p-3 border border-emerald-100 text-center shadow-sm">
            <div className="text-[9px] text-emerald-750 font-black uppercase tracking-wider mb-1">Kriteria ≥ 3.5</div>
            <div className="text-xl font-black text-emerald-800 font-heading">{summary.criteriaAbove3_5 || 0}</div>
          </div>
          <div className="bg-rose-50/70 backdrop-blur-md rounded-xl p-3 border border-rose-100 text-center shadow-sm">
            <div className="text-[9px] text-rose-750 font-black uppercase tracking-wider mb-1">Kriteria &lt; 2.0</div>
            <div className="text-xl font-black text-rose-800 font-heading">{summary.criteriaBellow2_0 || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringResultDisplay;