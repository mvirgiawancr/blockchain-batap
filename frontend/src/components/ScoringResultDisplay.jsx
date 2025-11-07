import React from 'react';
import { TrendingUp, Award, Star } from 'lucide-react';

const ScoringResultDisplay = ({ scoringResult }) => {
  if (!scoringResult) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Star className="w-6 h-6" />
          <p>Belum ada hasil skoring tersedia</p>
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
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-blue-900">Hasil Skoring Otomatis</h4>
            <p className="text-blue-600 text-sm">Metode: {finalMethod}</p>
          </div>
        </div>
        
        {/* Score Display - Only */}
        <div className="text-center">
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-blue-200">
            <div className="text-3xl font-bold text-blue-900">{scoreOn4Scale}</div>
            <div className="text-sm text-blue-600 mt-1">/ 4.0</div>
          </div>
          <p className="text-sm text-gray-600 mt-2 font-medium">Skor</p>
        </div>
      </div>
      
      {/* Summary Stats */}
      {summary && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
            <div className="text-xs text-gray-600 mb-1">Total Butir</div>
            <div className="text-lg font-bold text-blue-900">{summary.totalButir || 0}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
            <div className="text-xs text-green-700 mb-1">Kriteria ≥ 3.5</div>
            <div className="text-lg font-bold text-green-700">{summary.criteriaAbove3_5 || 0}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
            <div className="text-xs text-red-700 mb-1">Kriteria &lt; 2.0</div>
            <div className="text-lg font-bold text-red-700">{summary.criteriaBellow2_0 || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringResultDisplay;