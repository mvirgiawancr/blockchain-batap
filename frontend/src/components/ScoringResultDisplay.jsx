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
    grade,
    method
  } = scoringResult;

  const percentage = overall_percentage || 0;
  const finalGrade = grade || "C";
  const finalMethod = method || "LAM-TEK 2025";
  
  // Convert to 4.0 scale based on percentage (more accurate for LAM-TEK)
  const scoreOn4Scale = percentage ? (percentage / 100 * 4).toFixed(2) : '0.00';
  
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
        
        <div className="flex items-center gap-4">
          {/* Grade Display */}
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${gradeColor} flex items-center justify-center shadow-lg`}>
              <span className="text-2xl font-bold text-white">{finalGrade}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 font-medium">Grade</p>
          </div>
          
          {/* Score Display */}
          <div className="text-center">
            <div className="bg-white rounded-xl p-3 shadow-md border-2 border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{scoreOn4Scale}</div>
              <div className="text-sm text-blue-600">/ 4.0</div>
            </div>
            <p className="text-sm text-gray-600 mt-1 font-medium">Skor</p>
          </div>
          
          {/* Percentage Display */}
          <div className="text-center">
            <div className="bg-white rounded-xl p-3 shadow-md border-2 border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{percentage.toFixed(1)}</div>
              <div className="text-sm text-blue-600">%</div>
            </div>
            <p className="text-sm text-gray-600 mt-1 font-medium">Persentase</p>
          </div>
        </div>
      </div>
      
      {/* Grade Description */}
      <div className="mt-4 p-3 bg-white rounded-xl border border-blue-200">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Interpretasi: 
            <span className={`ml-1 font-semibold ${
              finalGrade === 'A' ? 'text-emerald-600' :
              finalGrade === 'B' ? 'text-blue-600' :
              finalGrade === 'C' ? 'text-yellow-600' :
              finalGrade === 'D' ? 'text-orange-600' : 'text-gray-600'
            }`}>
              {finalGrade === 'A' ? 'Unggul' :
               finalGrade === 'B' ? 'Sangat Baik' :
               finalGrade === 'C' ? 'Baik' :
               finalGrade === 'D' ? 'Cukup' : 'Perlu Perbaikan'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScoringResultDisplay;