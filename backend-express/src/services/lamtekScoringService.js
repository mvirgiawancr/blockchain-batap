/**
 * LAM-TEK 2025 Official Scoring Service
 * Implementasi sistem scoring yang sesuai dengan instrumen resmi LAM-TEK 2025
 * 
 * 7 KRITERIA AKREDITASI LAM-TEK 2025:
 * 1. Diferensiasi Misi
 * 2. Akuntabilitas
 * 3. Relevansi Pendidikan, Penelitian, dan PkM
 * 4. Sumber Daya Manusia
 * 5. Sarana, Prasarana, dan K3L
 * 6. Mahasiswa dan Luaran Mahasiswa
 * 7. Sistem Penjaminan Mutu
 */

const { CriteriaScore, LAMTEKScoringResult, ButirResult } = require('../models');
const geminiService = require('./geminiService');

class LAMTEKScoringService {
  constructor() {
    // BOP Thresholds
    this.bopThresholds = {
      lowLevel: { threshold: 40000000, divisor: 10000000 }, // D1, D2, D3, S, STr, PPI
      highLevel: { threshold: 28000000, divisor: 7000000 }  // M, MTr, D, DTr
    };

    // DPD Thresholds
    this.dpdThresholds = {
      lowLevel: { threshold: 30000000, divisor: 15000000 },
      highLevel: { threshold: 20000000, divisor: 10000000 }
    };

    // Low level and high level programs
    this.lowLevelPrograms = ['D1', 'D2', 'D3', 'S', 'STr', 'PPI'];
    this.highLevelPrograms = ['M', 'MTr', 'D', 'DTr'];
  }

  /**
   * Get criteriaConfig from GeminiService (LAM-TEK 2025 Instrumen)
   */
  getCriteriaConfig() {
    return geminiService.criteriaConfig;
  }

  /**
   * Get total butir count dynamically from criteriaConfig
   */
  getTotalButir(programType) {
    const config = this.getCriteriaConfig();
    const totalButir = Object.values(config).reduce((sum, criteria) => {
      return sum + (criteria.butir ? criteria.butir.length : 0);
    }, 0);
    console.log(`[LAM-TEK] Total butir for ${programType}: ${totalButir}`);
    return totalButir;
  }

  /**
   * Check if program uses low level thresholds
   */
  isLowLevelProgram(programType) {
    return this.lowLevelPrograms.includes(programType);
  }

  /**
   * Calculate interpolation score (3D formula)
   * Skor = 3.75 × ((A+B+(C/2))-(A×B)-((A×C)/2)-((B×C)/2)+((A×B×C)/2))
   */
  calculateInterpolationScore(ri, rn, rl, a, b, c) {
    ri = ri || 0;
    rn = rn || 0;
    rl = rl || 0;
    a = a || 1;
    b = b || 1;
    c = c || 1;

    console.log(`[LAM-TEK] Interpolation input: RI=${ri}, RN=${rn}, RL=${rl}, a=${a}, b=${b}, c=${c}`);

    // Apply constraints
    let constrainedRi = ri;
    let constrainedRn = rn;
    let constrainedRl = rl;

    if (ri >= a && rn < b) {
      constrainedRi = a;
      console.log(`[LAM-TEK] Applied constraint: RI >= a and RN < b, set RI = a (${a})`);
    } else if (ri < a && rn >= b) {
      constrainedRn = b;
      console.log(`[LAM-TEK] Applied constraint: RI < a and RN >= b, set RN = b (${b})`);
    }

    if (rl >= c) {
      constrainedRl = c;
      console.log(`[LAM-TEK] Applied constraint: RL >= c, set RL = c (${c})`);
    }

    // Calculate ratios
    const A = a !== 0 ? constrainedRi / a : 0;
    const B = b !== 0 ? constrainedRn / b : 0;
    const C = c !== 0 ? constrainedRl / c : 0;

    console.log(`[LAM-TEK] Ratios: A=${A.toFixed(3)}, B=${B.toFixed(3)}, C=${C.toFixed(3)}`);

    // Apply interpolation formula
    const score = 3.75 * (
      (A + B + (C / 2)) -
      (A * B) -
      ((A * C) / 2) -
      ((B * C) / 2) +
      ((A * B * C) / 2)
    );

    console.log(`[LAM-TEK] Interpolation result: ${score.toFixed(3)}`);

    return Math.min(4.0, Math.max(0.0, score));
  }

  /**
   * Calculate BOP score
   */
  calculateBOPScore(bopValue, programType) {
    const thresholds = this.isLowLevelProgram(programType)
      ? this.bopThresholds.lowLevel
      : this.bopThresholds.highLevel;

    if (bopValue >= thresholds.threshold) {
      return 4.0;
    } else {
      const score = bopValue / thresholds.divisor;
      return Math.min(4.0, score);
    }
  }

  /**
   * Calculate DPD score
   */
  calculateDPDScore(dpdValue, programType) {
    const thresholds = this.isLowLevelProgram(programType)
      ? this.dpdThresholds.lowLevel
      : this.dpdThresholds.highLevel;

    if (dpdValue >= thresholds.threshold) {
      return 4.0;
    } else {
      const score = (2 * dpdValue) / thresholds.divisor;
      return Math.min(4.0, score);
    }
  }

  /**
   * Calculate RMD score (Rasio Mahasiswa/DTPS)
   */
  calculateRMDScore(rmdValue, programType) {
    if (programType === 'S') {
      // Sarjana Butir 40
      if (rmdValue >= 15 && rmdValue <= 25) {
        return 4.0;
      } else if (rmdValue < 15) {
        return (4 * rmdValue) / 15;
      } else if (rmdValue > 25 && rmdValue < 35) {
        return (70 - (2 * rmdValue)) / 5;
      } else {
        return 0.0;
      }
    } else if (programType === 'PPI') {
      // PPI Butir 37
      if (rmdValue >= 4 && rmdValue <= 10) {
        return 4.0;
      } else if (rmdValue < 4) {
        return 1 + (3 * rmdValue) / 4;
      } else if (rmdValue > 10 && rmdValue <= 35) {
        return 4 - (((4 * rmdValue) - 40) / 25);
      } else {
        return 0.0;
      }
    } else {
      // Default calculation
      return rmdValue > 0 ? Math.min(4.0, (4 * 20) / rmdValue) : 0.0;
    }
  }

  /**
   * Calculate Waktu Tunggu score
   */
  calculateWaktuTungguScore(wtMonths, programType) {
    const isVokasi = ['D1', 'D2', 'D3', 'STr'].includes(programType);

    if (isVokasi) {
      // Vokasi: < 3 bulan = 4, 3-6 = formula, > 6 = 0
      if (wtMonths < 3) {
        return 4.0;
      } else if (wtMonths >= 3 && wtMonths <= 6) {
        return (24 - (4 * wtMonths)) / 3;
      } else {
        return 0.0;
      }
    } else {
      // Sarjana: < 6 bulan = 4, 6-18 = formula, > 18 = 0
      if (wtMonths < 6) {
        return 4.0;
      } else if (wtMonths >= 6 && wtMonths <= 18) {
        return (18 - wtMonths) / 3;
      } else {
        return 0.0;
      }
    }
  }

  /**
   * Calculate weighted average 1:2:1
   */
  calculateWeightedAverage121(scoreI, scoreII, scoreIII) {
    return (scoreI + (2 * scoreII) + scoreIII) / 4;
  }

  /**
   * Calculate weighted average 1:2:2
   */
  calculateWeightedAverage122(scoreI, scoreII, scoreIII) {
    return (scoreI + (2 * scoreII) + (2 * scoreIII)) / 5;
  }

  /**
   * Calculate simple average 1:1
   */
  calculateSimpleAverage(scoreI, scoreII) {
    return (scoreI + scoreII) / 2;
  }

  /**
   * Main method to calculate LAM-TEK 2025 scores (7 Criteria)
   */
  async calculateLAMTEKScores(programType, aiData) {
    console.log(`[LAM-TEK] Starting LAM-TEK 2025 scoring (7 Criteria) for program type: ${programType}`);

    try {
      const totalButir = this.getTotalButir(programType);
      const lkpsData = aiData.lkps_data || {};
      const ledData = aiData.led_data || {};

      // Sample calculations for demonstration
      const task1Scores = [];
      const task2Scores = [];
      const task3Scores = [];
      const task4Scores = [];

      // Kriteria 2: Akuntabilitas (BOP, DPD, Kerjasama)
      const bopValue = lkpsData.bop_value || 0;
      const bopScore = this.calculateBOPScore(bopValue, programType);
      task1Scores.push(bopScore);

      const dpdTotal = lkpsData.dpd_total || 0;
      const jumlahDtps = lkpsData.jumlah_dtps || 1;
      const dpdPerDtps = dpdTotal / jumlahDtps;
      const dpdScore = this.calculateDPDScore(dpdPerDtps, programType);
      task1Scores.push(dpdScore);

      // Kerjasama Score
      const ri = lkpsData.kerjasama_internasional || 0;
      const rn = lkpsData.kerjasama_nasional || 0;
      const rl = lkpsData.kerjasama_wilayah || 0;
      const [a, b, c] = programType === 'D' || programType === 'DTr' ? [3, 8, 10] : [2, 6, 8];
      const kerjasamaScore = this.calculateInterpolationScore(ri, rn, rl, a, b, c);
      task1Scores.push(kerjasamaScore);

      // Kriteria 4: SDM (RMD, etc.)
      const rmd = lkpsData.rmd || 0;
      const rmdScore = this.calculateRMDScore(rmd, programType);
      task2Scores.push(rmdScore);
      task2Scores.push(3.5, 3.2, 3.8); // Sample scores

      // Kriteria 6: Mahasiswa dan Luaran (Waktu Tunggu, etc.)
      const waktuTunggu = lkpsData.wt || 6.0;
      const wtScore = this.calculateWaktuTungguScore(waktuTunggu, programType);
      task3Scores.push(wtScore);
      task3Scores.push(3.6, 3.4, 3.7, 3.3); // Sample scores

      // Composite scores
      const composite1 = this.calculateWeightedAverage121(3.5, 3.7, 3.4);
      const composite2 = this.calculateSimpleAverage(3.6, 3.8);
      task4Scores.push(composite1, composite2, 3.5, 3.6);

      // Calculate totals
      const task1Total = task1Scores.reduce((a, b) => a + b, 0);
      const task2Total = task2Scores.reduce((a, b) => a + b, 0);
      const task3Total = task3Scores.reduce((a, b) => a + b, 0);
      const task4Total = task4Scores.reduce((a, b) => a + b, 0);

      const totalScore = task1Total + task2Total + task3Total + task4Total;
      const butirCompleted = task1Scores.length + task2Scores.length + task3Scores.length + task4Scores.length;
      const percentage = (totalScore / totalButir) * 100;

      // Determine grade
      let grade = 'E';
      if (percentage >= 90) grade = 'A';
      else if (percentage >= 80) grade = 'B';
      else if (percentage >= 70) grade = 'C';
      else if (percentage >= 60) grade = 'D';

      // Create result
      const result = new LAMTEKScoringResult(programType);
      result.summary.totalButir = totalButir;
      result.summary.butirCompleted = butirCompleted;
      result.summary.totalScore = totalScore;
      result.summary.percentage = percentage;
      result.summary.grade = grade;
      result.summary.criteriaBreakdown = {
        kriteria_1_diferensiasi_misi: 0,
        kriteria_2_akuntabilitas: task1Total,
        kriteria_3_relevansi: 0,
        kriteria_4_sdm: task2Total,
        kriteria_5_sarana_prasarana: 0,
        kriteria_6_mahasiswa_luaran: task3Total,
        kriteria_7_penjaminan_mutu: 0
      };

      result.criteriaScores = [
        { criteria: '1 - Diferensiasi Misi', score: 0, description: 'VMTS' },
        { criteria: '2 - Akuntabilitas', score: task1Total, details: task1Scores, description: 'BOP, DPD, Kerjasama' },
        { criteria: '3 - Relevansi Pendidikan, Penelitian, dan PkM', score: 0, description: 'Kurikulum, Pembelajaran' },
        { criteria: '4 - Sumber Daya Manusia', score: task2Total, details: task2Scores, description: 'DTPS, Kinerja' },
        { criteria: '5 - Sarana, Prasarana, dan K3L', score: 0, description: 'Sarpras, K3L' },
        { criteria: '6 - Mahasiswa dan Luaran Mahasiswa', score: task3Total, details: task3Scores, description: 'RMD, Lulusan' },
        { criteria: '7 - Sistem Penjaminan Mutu', score: 0, description: 'SPMI' }
      ];

      console.log(`[LAM-TEK] ✅ Scoring completed: ${butirCompleted}/${totalButir} butir, Grade: ${grade} (${percentage.toFixed(1)}%)`);
      return result;

    } catch (error) {
      console.error(`[LAM-TEK] ❌ Error in calculate LAM-TEK scores: ${error.message}`);
      const errorResult = new LAMTEKScoringResult(programType);
      errorResult.summary.error = error.message;
      return errorResult;
    }
  }

  /**
   * NEW: Calculate detailed scores per criteria with LAM-TEK 2025 Instrumen structure
   * This method calculates all 7 criteria scores using dynamic butir from criteriaConfig
   */
  calculateDetailedLAMTEKScores(ledData, lkpsData, programType = 'S') {
    console.log(`[LAM-TEK] 🎯 Calculating DETAILED 7 Criteria scores for ${programType} using LAM-TEK 2025 Instrumen`);

    const config = this.getCriteriaConfig();
    const totalButir = this.getTotalButir(programType);
    const maxPossibleScore = totalButir * 4; // Each butir max score is 4

    // Initialize criteria scores storage
    const criteriaScores = {};
    let totalWeightedScore = 0; // Sum of (average_score × bobot)

    // ============================================
    // KRITERIA 1: DIFERENSIASI MISI (Bobot: 2.05)
    // ============================================
    const criteria1 = this.calculateKriteria1Score(ledData, programType);
    const criteria1Config = config[1];
    criteriaScores['1'] = new CriteriaScore({
      criteriaNumber: 1,
      criteriaCode: 'DM',
      criteriaName: criteria1Config.name,
      butirScores: criteria1.butirScores,
      averageScore: criteria1.average,
      totalScore: criteria1.total,
      butirCount: criteria1.butirCount,
      maxPossibleScore: criteria1.butirCount * 4,
      percentage: (criteria1.total / (criteria1.butirCount * 4)) * 100,
      bobot: criteria1Config.bobot
    });
    totalWeightedScore += criteria1.average * (criteria1Config.bobot / 100);

    // ============================================
    // KRITERIA 2: AKUNTABILITAS (Bobot: 7.06)
    // ============================================
    const criteria2 = this.calculateKriteria2Score(ledData, lkpsData, programType);
    const criteria2Config = config[2];
    criteriaScores['2'] = new CriteriaScore({
      criteriaNumber: 2,
      criteriaCode: 'AK',
      criteriaName: criteria2Config.name,
      butirScores: criteria2.butirScores,
      averageScore: criteria2.average,
      totalScore: criteria2.total,
      butirCount: criteria2.butirCount,
      maxPossibleScore: criteria2.butirCount * 4,
      percentage: (criteria2.total / (criteria2.butirCount * 4)) * 100,
      bobot: criteria2Config.bobot
    });
    totalWeightedScore += criteria2.average * (criteria2Config.bobot / 100);

    // ============================================
    // KRITERIA 3: RELEVANSI PENDIDIKAN, PENELITIAN, DAN PKM (Bobot: 22.45)
    // ============================================
    const criteria3 = this.calculateKriteria3Score(ledData, lkpsData, programType);
    const criteria3Config = config[3];
    criteriaScores['3'] = new CriteriaScore({
      criteriaNumber: 3,
      criteriaCode: 'REL',
      criteriaName: criteria3Config.name,
      butirScores: criteria3.butirScores,
      averageScore: criteria3.average,
      totalScore: criteria3.total,
      butirCount: criteria3.butirCount,
      maxPossibleScore: criteria3.butirCount * 4,
      percentage: (criteria3.total / (criteria3.butirCount * 4)) * 100,
      bobot: criteria3Config.bobot
    });
    totalWeightedScore += criteria3.average * (criteria3Config.bobot / 100);

    // ============================================
    // KRITERIA 4: SUMBER DAYA MANUSIA (Bobot: 13.44)
    // ============================================
    const criteria4 = this.calculateKriteria4Score(lkpsData, programType);
    const criteria4Config = config[4];
    criteriaScores['4'] = new CriteriaScore({
      criteriaNumber: 4,
      criteriaCode: 'SDM',
      criteriaName: criteria4Config.name,
      butirScores: criteria4.butirScores,
      averageScore: criteria4.average,
      totalScore: criteria4.total,
      butirCount: criteria4.butirCount,
      maxPossibleScore: criteria4.butirCount * 4,
      percentage: (criteria4.total / (criteria4.butirCount * 4)) * 100,
      bobot: criteria4Config.bobot
    });
    totalWeightedScore += criteria4.average * (criteria4Config.bobot / 100);

    // ============================================
    // KRITERIA 5: SARANA, PRASARANA, DAN K3L (Bobot: 7.51)
    // ============================================
    const criteria5 = this.calculateKriteria5Score(ledData, programType);
    const criteria5Config = config[5];
    criteriaScores['5'] = new CriteriaScore({
      criteriaNumber: 5,
      criteriaCode: 'SARPRAS',
      criteriaName: criteria5Config.name,
      butirScores: criteria5.butirScores,
      averageScore: criteria5.average,
      totalScore: criteria5.total,
      butirCount: criteria5.butirCount,
      maxPossibleScore: criteria5.butirCount * 4,
      percentage: (criteria5.total / (criteria5.butirCount * 4)) * 100,
      bobot: criteria5Config.bobot
    });
    totalWeightedScore += criteria5.average * (criteria5Config.bobot / 100);

    // ============================================
    // KRITERIA 6: MAHASISWA DAN LUARAN MAHASISWA (Bobot: 26.87)
    // ============================================
    const criteria6 = this.calculateKriteria6Score(lkpsData, programType);
    const criteria6Config = config[6];
    criteriaScores['6'] = new CriteriaScore({
      criteriaNumber: 6,
      criteriaCode: 'MHS',
      criteriaName: criteria6Config.name,
      butirScores: criteria6.butirScores,
      averageScore: criteria6.average,
      totalScore: criteria6.total,
      butirCount: criteria6.butirCount,
      maxPossibleScore: criteria6.butirCount * 4,
      percentage: (criteria6.total / (criteria6.butirCount * 4)) * 100,
      bobot: criteria6Config.bobot
    });
    totalWeightedScore += criteria6.average * (criteria6Config.bobot / 100);

    // ============================================
    // KRITERIA 7: SISTEM PENJAMINAN MUTU (Bobot: 15.35)
    // ============================================
    const criteria7 = this.calculateKriteria7Score(ledData, programType);
    const criteria7Config = config[7];
    criteriaScores['7'] = new CriteriaScore({
      criteriaNumber: 7,
      criteriaCode: 'SPM',
      criteriaName: criteria7Config.name,
      butirScores: criteria7.butirScores,
      averageScore: criteria7.average,
      totalScore: criteria7.total,
      butirCount: criteria7.butirCount,
      maxPossibleScore: criteria7.butirCount * 4,
      percentage: (criteria7.total / (criteria7.butirCount * 4)) * 100,
      bobot: criteria7Config.bobot
    });
    totalWeightedScore += criteria7.average * (criteria7Config.bobot / 100);

    // ============================================
    // CALCULATE SUMMARY STATISTICS
    // ============================================
    const allAverages = Object.values(criteriaScores).map(c => c.averageScore);
    const averageScoreAllCriteria = allAverages.reduce((a, b) => a + b, 0) / allAverages.length; // Simple average
    const criteriaAbove3_5 = allAverages.filter(avg => avg >= 3.5).length;
    const criteriaBellow2_0 = allAverages.filter(avg => avg < 2.0).length;

    // Calculate final score using weighted average (totalWeightedScore should be out of 4.0)
    const finalScore = totalWeightedScore;

    // Determine akreditasi grade based on weighted score (0-4 scale)
    let akreditasi = 'Tidak Terakreditasi';
    let grade = 'E';
    if (finalScore >= 3.61) {
      akreditasi = 'Unggul';
      grade = 'A';
    } else if (finalScore >= 3.01) {
      akreditasi = 'Baik Sekali';
      grade = 'B';
    } else if (finalScore >= 2.00) {
      akreditasi = 'Baik';
      grade = 'C';
    } else if (finalScore >= 1.50) {
      akreditasi = 'Minimum';
      grade = 'D';
    }

    // Calculate percentage from weighted score (out of 4)
    const overallPercentage = (finalScore / 4) * 100;

    // Create result object
    const result = new LAMTEKScoringResult({
      finalScore: finalScore, // Weighted average score (0-4)
      maxPossibleScore: 4.0, // Max weighted score is 4.0
      percentage: overallPercentage, // Percentage from weighted score
      overallScore: finalScore, // Same as finalScore
      grade: grade, // A, B, C, D, E
      akreditasi: akreditasi, // Unggul, Baik Sekali, Baik, Minimum, Tidak Terakreditasi
      criteriaScores: criteriaScores,
      summary: {
        totalButir: totalButir,
        averageScoreAllCriteria: averageScoreAllCriteria, // Simple average (for reference)
        weightedScore: finalScore, // Weighted average (official score)
        criteriaAbove3_5: criteriaAbove3_5,
        criteriaBellow2_0: criteriaBellow2_0,
      },
      programType: programType,
      calculatedAt: new Date().toISOString()
    });

    console.log(`[LAM-TEK] ✅ DETAILED Scoring complete (LAM-TEK 2025):`);
    console.log(`   Weighted Score: ${finalScore.toFixed(2)} / 4.00 (${overallPercentage.toFixed(1)}%)`);
    console.log(`   Grade: ${grade} - ${akreditasi}`);
    console.log(`   Total Butir: ${totalButir}`);
    console.log(`   Criteria Summary:`);
    Object.values(criteriaScores).forEach(c => {
      console.log(`      ${c.criteriaNumber}. ${c.criteriaName}: avg=${c.averageScore.toFixed(2)}, bobot=${c.bobot}%`);
    });

    return result;
  }

  /**
   * Calculate Kriteria 1: Diferensiasi Misi scores (1 butir untuk LAM-TEK 2025)
   */
  calculateKriteria1Score(ledData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 1 hanya memiliki 1 butir
    // Butir 1.1: Visi, Misi, Tujuan dan Sasaran (Indikator Kinerja Utama)
    // Ini adalah penilaian kualitatif komprehensif yang menggabungkan beberapa aspek VMTS
    butirScores['1.1'] = 3.5; // Default, should be evaluated from LED using AI analysis
    
    const butirCount = 1; // Fixed untuk LAM-TEK 2025
    const total = butirScores['1.1'];
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 2: Akuntabilitas scores (3 butir untuk LAM-TEK 2025)
   */
  calculateKriteria2Score(ledData, lkpsData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 2 memiliki 3 butir
    // Butir 2.1: Tata Pamong dan Tata Kelola (Kualitatif - combines old butir 2.1 & 2.2)
    butirScores['2.1'] = 3.5; // Evaluasi kelengkapan dan governance
    
    // Butir 2.2: Kerjasama (Kuantitatif 3D)
    const ri = lkpsData.kerjasama_internasional || 0;
    const rn = lkpsData.kerjasama_nasional || 0;
    const rl = lkpsData.kerjasama_wilayah || 0;
    const [a, b, c] = programType === 'D' || programType === 'DTr' ? [3, 8, 10] : [2, 6, 8];
    const kerjasamaScore = this.calculateInterpolationScore(ri, rn, rl, a, b, c);
    // Jika tidak ada data kerjasama sama sekali, beri skor baseline 2.0
    butirScores['2.2'] = (ri === 0 && rn === 0 && rl === 0) ? 2.0 : kerjasamaScore;
    
    // Butir 2.3: Keuangan (Kuantitatif - combines BOP & DPD)
    const bopValue = lkpsData.bop_value || 0;
    const bopScore = this.calculateBOPScore(bopValue, programType);
    
    const dpdTotal = lkpsData.dpd_total || 0;
    const jumlahDtps = lkpsData.jumlah_dtps || 1;
    const dpdPerDtps = dpdTotal / jumlahDtps;
    const dpdScore = this.calculateDPDScore(dpdPerDtps, programType);
    
    // Average of BOP and DPD for combined Keuangan butir
    // Jika tidak ada data keuangan, beri skor baseline 2.5
    const avgKeuangan = (bopScore + dpdScore) / 2;
    butirScores['2.3'] = (bopValue === 0 && dpdTotal === 0) ? 2.5 : avgKeuangan;
    
    const butirCount = 3; // Fixed untuk LAM-TEK 2025
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 3: Relevansi scores (3 butir untuk LAM-TEK 2025)
   */
  calculateKriteria3Score(ledData, lkpsData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 3 memiliki 3 butir
    // Butir 3.1: Pendidikan (combines kurikulum, pembelajaran)
    butirScores['3.1'] = 3.5; // Evaluasi pemutakhiran kurikulum, RPS, pembelajaran SCL
    
    // Butir 3.2: Penelitian (kesesuaian dengan bidang ilmu)
    butirScores['3.2'] = 3.5; // Kesesuaian penelitian DTPS
    
    // Butir 3.3: Pengabdian kepada Masyarakat (kesesuaian dengan bidang ilmu)
    butirScores['3.3'] = 3.5; // Kesesuaian PkM dengan bidang ilmu
    
    const butirCount = 3; // Fixed untuk LAM-TEK 2025
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 4: SDM scores (2 butir untuk LAM-TEK 2025)
   */
  calculateKriteria4Score(lkpsData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 4 memiliki 2 butir
    // Butir 4.1: Profil Dosen dan Tenaga Kependidikan (combines NDTPS, PDTT, PDS3, PGBLKL)
    const ndtps = lkpsData.ndtps || 0;
    const ndtpsScore = ndtps >= 12 ? 4 : (ndtps / 12) * 4;
    
    const pdtt = lkpsData.pdtt || 0;
    const pdttScore = pdtt <= 10 ? 4 : 4 - ((pdtt - 10) / 10);
    
    const pds3 = lkpsData.pds3 || 0;
    const pds3Score = pds3 >= 80 ? 4 : (pds3 / 80) * 4;
    
    const pgblkl = lkpsData.pgblkl || 0;
    const pgblklScore = pgblkl >= 70 ? 4 : (pgblkl / 70) * 4;
    
    // Average of multiple indicators for Profil Dosen
    butirScores['4.1'] = (ndtpsScore + pdttScore + pds3Score + pgblklScore) / 4;
    
    // Butir 4.2: Beban dan Kinerja DTPS (combines RBK, publikasi, penelitian, PkM)
    const rbk = lkpsData.rbk_dtps || 0;
    const rbkScore = rbk >= 10 && rbk <= 16 ? 4 : 4 - Math.abs(13 - rbk) * 0.3;
    
    const publikasiRI = lkpsData.publikasi_ilmiah_dtps_ri || 0;
    const publikasiRN = lkpsData.publikasi_ilmiah_dtps_rn || 0;
    const publikasiScore = this.calculateInterpolationScore(publikasiRI, publikasiRN, 0, 2, 4, 0);
    
    // Average of RBK and publikasi for Beban Kinerja
    butirScores['4.2'] = (rbkScore + publikasiScore) / 2;
    
    const butirCount = 2; // Fixed untuk LAM-TEK 2025
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 5: Sarana, Prasarana, dan K3L scores (1 butir untuk LAM-TEK 2025)
   */
  calculateKriteria5Score(ledData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 5 hanya memiliki 1 butir
    // Butir 5.1: Sarana, Prasarana, dan K3L (komprehensif)
    // Combines evaluasi sarana akademik, non-akademik, dan K3L
    butirScores['5.1'] = 3.5; // Evaluasi kualitatif komprehensif dari LED
    
    const butirCount = 1; // Fixed untuk LAM-TEK 2025
    const total = butirScores['5.1'];
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 6: Mahasiswa dan Luaran scores (1 butir untuk LAM-TEK 2025)
   */
  calculateKriteria6Score(lkpsData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 6 hanya memiliki 1 butir
    // Butir 6.1: Mahasiswa dan Luaran Mahasiswa (komprehensif)
    // Combines RMD, PMA, IPK, prestasi, publikasi, PTW, WT, KBK, tingkat tempat kerja
    
    const rmd = lkpsData.rmd || 0;
    const rmdScore = this.calculateRMDScore(rmd, programType);
    
    const pma = lkpsData.pma || 0;
    const pmaScore = pma >= 2 ? 4 : pma > 0 ? (pma / 2) * 4 : 2.0;
    
    const ripk = lkpsData.ripk || 0;
    const ripkScore = ripk >= 3.5 ? 4 : ripk > 0 ? (ripk / 3.5) * 4 : 2.5;
    
    const prestasiRI = lkpsData.prestasi_akademik_ri || 0;
    const prestasiRN = lkpsData.prestasi_akademik_rn || 0;
    const prestasiScore = this.calculateInterpolationScore(prestasiRI, prestasiRN, 0, 2, 5, 0);
    
    const ptw = lkpsData.ptw || 0;
    const ptwScore = ptw >= 80 ? 4 : ptw > 0 ? (ptw / 80) * 4 : 2.0;
    
    const wt = lkpsData.wt || 6;
    const wtScore = this.calculateWaktuTungguScore(wt, programType);
    
    const kbk = lkpsData.kbk || 0;
    const kbkScore = kbk >= 80 ? 4 : kbk > 0 ? (kbk / 80) * 4 : 2.0;
    
    // Average of multiple indicators for Mahasiswa dan Luaran
    // Set minimum baseline score to avoid 0 when data is missing
    const totalScore = rmdScore + pmaScore + ripkScore + prestasiScore + ptwScore + wtScore + kbkScore;
    butirScores['6.1'] = Math.max(totalScore / 7, 2.0);
    
    const butirCount = 1; // Fixed untuk LAM-TEK 2025
    const total = butirScores['6.1'];
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 7: Penjaminan Mutu scores (1 butir untuk LAM-TEK 2025)
   */
  calculateKriteria7Score(ledData, programType) {
    const butirScores = {};
    
    // LAM-TEK 2025: Kriteria 7 hanya memiliki 1 butir
    // Butir 7.1: Sistem Penjaminan Mutu (komprehensif)
    // Combines keberadaan unit SPMI, ketersediaan dokumen, keterlaksanaan, evaluasi, kepuasan
    butirScores['7.1'] = 3.5; // Evaluasi kualitatif komprehensif dari LED
    
    const butirCount = 1; // Fixed untuk LAM-TEK 2025
    const total = butirScores['7.1'];
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }
}

module.exports = new LAMTEKScoringService();
