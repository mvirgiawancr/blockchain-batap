/**
 * LAM-TEK 2025 Data Models (7 Kriteria)
 * Definisi struktur data untuk sistem akreditasi LAM-TEK 2025
 */

/**
 * Document Model
 */
class Document {
  constructor(type, cid, hash, filename = null, verified = false, confidence = 0.0) {
    this.type = type; // 'LED' or 'LKPS'
    this.cid = cid;
    this.hash = hash;
    this.filename = filename;
    this.verified = verified;
    this.confidence = confidence;
    this.encrypted = false; // Default to false for backward compatibility
  }
}

/**
 * AI Recommendation Model - LAM-TEK 2025 (7 Criteria)
 */
class AIRecommendation {
  constructor(data = {}) {
    this.hasLED = data.hasLED !== undefined ? data.hasLED : false;
    this.hasLKPS = data.hasLKPS !== undefined ? data.hasLKPS : false;
    this.ledCriteriaCoverage = data.ledCriteriaCoverage || {}; // Coverage 7 kriteria akreditasi LAM-TEK 2025
    this.lkpsDataCompleteness = data.lkpsDataCompleteness || {};
    this.lkpsNumericData = data.lkpsNumericData || {}; // Store numeric data from LKPS
    this.flags = data.flags || [];
    this.recommendations = data.recommendations || [];
    this.scoreCompleteness = data.scoreCompleteness || 0.0;
    this.readyForScoring = data.readyForScoring !== undefined ? data.readyForScoring : false;
    this.notes = data.notes || '';
    this.analyzedAt = data.analyzedAt || null;
    this.scoring = data.scoring || null; // Hasil perhitungan skoring lengkap LAM-TEK
    this.scoring_analysis = data.scoring_analysis || null;
    this.scoring_error = data.scoring_error || null;
  }
}

/**
 * Decision Model
 */
class Decision {
  constructor(result, notes, decidedBy, decidedAt) {
    this.result = result; // "approved" or "rejected"
    this.notes = notes;
    this.decidedBy = decidedBy;
    this.decidedAt = decidedAt;
  }
}

/**
 * Submission Model - LAM-TEK 2025
 */
class Submission {
  constructor(submissionId, programStudi, institusi, programType = 'S') {
    this.submissionId = submissionId;
    this.programStudi = programStudi;
    this.institusi = institusi;
    this.programType = programType; // S, M, D, D1, D2, D3, STr, MTr, DTr, PPI
    this.documents = [];
    this.status = 'draft'; // draft, pending, approved, rejected
    this.version = 1;
    this.ai = null; // AIRecommendation
    this.decision = null; // Decision
    this.submittedBy = null; // username/identifier of uploader
    this.submittedByRole = null;
    this.submittedByOrg = null;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  addDocument(document) {
    this.documents.push(document);
  }

  setAIRecommendation(aiRecommendation) {
    this.ai = aiRecommendation;
  }

  setDecision(decision) {
    this.decision = decision;
  }
}

/**
 * Criteria Score Model (Individual Criterion)
 */
class CriteriaScore {
  constructor(data = {}) {
    this.criteriaNumber = data.criteriaNumber || 0;
    this.criteriaCode = data.criteriaCode || '';
    this.criteriaName = data.criteriaName || '';
    this.butirScores = data.butirScores || {}; // { butir1: 3.5, butir2: 4.0, ... }
    this.butirReasons = data.butirReasons || {}; // { butir1: 'calculated', butir2: 'not_available', ... }
    this.averageScore = data.averageScore || 0; // Rata-rata skor butir
    this.totalScore = data.totalScore || 0; // Average * jumlah butir
    this.butirCount = data.butirCount || 0; // Jumlah butir untuk kriteria ini
    this.maxPossibleScore = data.maxPossibleScore || 0; // butirCount * 4
    this.percentage = data.percentage || 0; // (totalScore / maxPossibleScore) * 100
    this.bobot = data.bobot || 0; // Bobot/weight for this criteria (LAM-TEK 2025)
  }
}

/**
 * LAM-TEK Scoring Result Model
 */
class LAMTEKScoringResult {
  constructor(data = {}) {
    this.finalScore = data.finalScore || 0; // Total sum of all butir scores (for reference)
    this.maxPossibleScore = data.maxPossibleScore || 0; // Max score berdasarkan program type
    this.percentage = data.percentage || 0; // Percentage from overall average (0-100%)
    this.overallScore = data.overallScore || 0; // Average of 7 criteria averages (0-4 scale)
    this.grade = data.grade || 'E'; // A, B, C, D, E
    this.akreditasi = data.akreditasi || 'Tidak Terakreditasi'; // Unggul, Baik Sekali, Baik, Minimum
    
    // Breakdown per kriteria (7 kriteria)
    this.criteriaScores = data.criteriaScores || {}; // { '1': CriteriaScore, '2': CriteriaScore, ... }
    
    // Summary
    this.summary = data.summary || {
      totalButir: 0,
      averageScoreAllCriteria: 0, // Simple average of all criteria (for reference)
      weightedScore: 0, // Weighted average based on bobot (official LAM-TEK 2025 score)
      criteriaAbove3_5: 0, // Jumlah kriteria dengan average > 3.5
      criteriaBellow2_0: 0, // Jumlah kriteria dengan average < 2.0
    };
    
    this.programType = data.programType || 'S';
    this.calculatedAt = data.calculatedAt || new Date().toISOString();
    
    // Legacy support (untuk backward compatibility)
    this.criteriaBreakdown = data.criteriaBreakdown || {};
  }
}

/**
 * Butir Result Model
 */
class ButirResult {
  constructor(butirNumber, butirName, subIndicator, score, method, bobotButir, weightedContribution, details = null) {
    this.butirNumber = butirNumber;
    this.butirName = butirName;
    this.subIndicator = subIndicator; // I, II, III, atau tunggal
    this.score = score;
    this.method = method; // Kualitatif / Kuantitatif / Komposit
    this.bobotButir = bobotButir;
    this.weightedContribution = weightedContribution;
    this.details = details;
  }
}

module.exports = {
  Document,
  AIRecommendation,
  Decision,
  Submission,
  CriteriaScore,
  LAMTEKScoringResult,
  ButirResult
};
