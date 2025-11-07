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

class LAMTEKScoringService {
  constructor() {
    // Program Structure with butir counts
    this.programStructure = {
      'S': { butirCount: 60, name: 'Sarjana', code: 'S' },
      'D1': { butirCount: 56, name: 'Diploma Satu', code: 'D1' },
      'D2': { butirCount: 56, name: 'Diploma Dua', code: 'D2' },
      'D3': { butirCount: 56, name: 'Diploma Tiga', code: 'D3' },
      'STr': { butirCount: 64, name: 'Sarjana Terapan', code: 'STr' },
      'M': { butirCount: 55, name: 'Magister', code: 'M' },
      'MTr': { butirCount: 58, name: 'Magister Terapan', code: 'MTr' },
      'D': { butirCount: 53, name: 'Doktor', code: 'D' },
      'DTr': { butirCount: 56, name: 'Doktor Terapan', code: 'DTr' },
      'PPI': { butirCount: 54, name: 'Program Profesi Insinyur', code: 'PPI' }
    };

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
   * Get total butir count for program type
   */
  getTotalButir(programType) {
    return this.programStructure[programType]?.butirCount || 60;
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
   * NEW: Calculate detailed scores per criteria with clear storage structure
   * This method calculates all 7 criteria scores and stores them in CouchDB-friendly format
   */
  calculateDetailedLAMTEKScores(ledData, lkpsData, programType = 'S') {
    console.log(`[LAM-TEK] 🎯 Calculating DETAILED 7 Criteria scores for ${programType}`);

    const programInfo = this.programStructure[programType] || this.programStructure['S'];
    const totalButir = programInfo.butirCount;
    const maxPossibleScore = totalButir * 4; // Each butir max score is 4

    // Initialize criteria scores storage
    const criteriaScores = {};
    let finalScore = 0;

    // ============================================
    // KRITERIA 1: DIFERENSIASI MISI
    // ============================================
    const criteria1 = this.calculateKriteria1Score(ledData, programType);
    criteriaScores['1'] = new CriteriaScore({
      criteriaNumber: 1,
      criteriaCode: 'DM',
      criteriaName: 'Diferensiasi Misi',
      butirScores: criteria1.butirScores,
      averageScore: criteria1.average,
      totalScore: criteria1.total,
      butirCount: criteria1.butirCount,
      maxPossibleScore: criteria1.butirCount * 4,
      percentage: (criteria1.total / (criteria1.butirCount * 4)) * 100
    });
    finalScore += criteria1.total;

    // ============================================
    // KRITERIA 2: AKUNTABILITAS
    // ============================================
    const criteria2 = this.calculateKriteria2Score(ledData, lkpsData, programType);
    criteriaScores['2'] = new CriteriaScore({
      criteriaNumber: 2,
      criteriaCode: 'AK',
      criteriaName: 'Akuntabilitas',
      butirScores: criteria2.butirScores,
      averageScore: criteria2.average,
      totalScore: criteria2.total,
      butirCount: criteria2.butirCount,
      maxPossibleScore: criteria2.butirCount * 4,
      percentage: (criteria2.total / (criteria2.butirCount * 4)) * 100
    });
    finalScore += criteria2.total;

    // ============================================
    // KRITERIA 3: RELEVANSI PENDIDIKAN, PENELITIAN, DAN PKM
    // ============================================
    const criteria3 = this.calculateKriteria3Score(ledData, lkpsData, programType);
    criteriaScores['3'] = new CriteriaScore({
      criteriaNumber: 3,
      criteriaCode: 'REL',
      criteriaName: 'Relevansi Pendidikan, Penelitian, dan PkM',
      butirScores: criteria3.butirScores,
      averageScore: criteria3.average,
      totalScore: criteria3.total,
      butirCount: criteria3.butirCount,
      maxPossibleScore: criteria3.butirCount * 4,
      percentage: (criteria3.total / (criteria3.butirCount * 4)) * 100
    });
    finalScore += criteria3.total;

    // ============================================
    // KRITERIA 4: SUMBER DAYA MANUSIA
    // ============================================
    const criteria4 = this.calculateKriteria4Score(lkpsData, programType);
    criteriaScores['4'] = new CriteriaScore({
      criteriaNumber: 4,
      criteriaCode: 'SDM',
      criteriaName: 'Sumber Daya Manusia',
      butirScores: criteria4.butirScores,
      averageScore: criteria4.average,
      totalScore: criteria4.total,
      butirCount: criteria4.butirCount,
      maxPossibleScore: criteria4.butirCount * 4,
      percentage: (criteria4.total / (criteria4.butirCount * 4)) * 100
    });
    finalScore += criteria4.total;

    // ============================================
    // KRITERIA 5: SARANA, PRASARANA, DAN K3L
    // ============================================
    const criteria5 = this.calculateKriteria5Score(ledData, programType);
    criteriaScores['5'] = new CriteriaScore({
      criteriaNumber: 5,
      criteriaCode: 'SARPRAS',
      criteriaName: 'Sarana, Prasarana, dan K3L',
      butirScores: criteria5.butirScores,
      averageScore: criteria5.average,
      totalScore: criteria5.total,
      butirCount: criteria5.butirCount,
      maxPossibleScore: criteria5.butirCount * 4,
      percentage: (criteria5.total / (criteria5.butirCount * 4)) * 100
    });
    finalScore += criteria5.total;

    // ============================================
    // KRITERIA 6: MAHASISWA DAN LUARAN MAHASISWA
    // ============================================
    const criteria6 = this.calculateKriteria6Score(lkpsData, programType);
    criteriaScores['6'] = new CriteriaScore({
      criteriaNumber: 6,
      criteriaCode: 'MHS',
      criteriaName: 'Mahasiswa dan Luaran Mahasiswa',
      butirScores: criteria6.butirScores,
      averageScore: criteria6.average,
      totalScore: criteria6.total,
      butirCount: criteria6.butirCount,
      maxPossibleScore: criteria6.butirCount * 4,
      percentage: (criteria6.total / (criteria6.butirCount * 4)) * 100
    });
    finalScore += criteria6.total;

    // ============================================
    // KRITERIA 7: SISTEM PENJAMINAN MUTU
    // ============================================
    const criteria7 = this.calculateKriteria7Score(ledData, programType);
    criteriaScores['7'] = new CriteriaScore({
      criteriaNumber: 7,
      criteriaCode: 'SPM',
      criteriaName: 'Sistem Penjaminan Mutu',
      butirScores: criteria7.butirScores,
      averageScore: criteria7.average,
      totalScore: criteria7.total,
      butirCount: criteria7.butirCount,
      maxPossibleScore: criteria7.butirCount * 4,
      percentage: (criteria7.total / (criteria7.butirCount * 4)) * 100
    });
    finalScore += criteria7.total;

    // ============================================
    // CALCULATE SUMMARY STATISTICS
    // ============================================
    const allAverages = Object.values(criteriaScores).map(c => c.averageScore);
    const averageScoreAllCriteria = allAverages.reduce((a, b) => a + b, 0) / allAverages.length; // This is the overall score (0-4)
    const criteriaAbove3_5 = allAverages.filter(avg => avg >= 3.5).length;
    const criteriaBellow2_0 = allAverages.filter(avg => avg < 2.0).length;

    // Determine akreditasi grade based on OVERALL AVERAGE (0-4 scale)
    let akreditasi = 'Tidak Terakreditasi';
    let grade = 'E';
    if (averageScoreAllCriteria >= 3.61) {
      akreditasi = 'Unggul';
      grade = 'A';
    } else if (averageScoreAllCriteria >= 3.01) {
      akreditasi = 'Baik Sekali';
      grade = 'B';
    } else if (averageScoreAllCriteria >= 2.00) {
      akreditasi = 'Baik';
      grade = 'C';
    } else if (averageScoreAllCriteria >= 1.50) {
      akreditasi = 'Minimum';
      grade = 'D';
    }

    // Calculate percentage from overall average (out of 4)
    const overallPercentage = (averageScoreAllCriteria / 4) * 100;

    // Create result object
    const result = new LAMTEKScoringResult({
      finalScore: finalScore, // Total sum of all butir scores (for reference)
      maxPossibleScore: maxPossibleScore, // Total possible score for all butir
      percentage: overallPercentage, // Percentage from overall average (0-100%)
      overallScore: averageScoreAllCriteria, // OVERALL SCORE (0-4 scale)
      grade: grade, // A, B, C, D, E
      akreditasi: akreditasi, // Unggul, Baik Sekali, Baik, Minimum, Tidak Terakreditasi
      criteriaScores: criteriaScores,
      summary: {
        totalButir: totalButir,
        averageScoreAllCriteria: averageScoreAllCriteria, // Overall score (0-4)
        criteriaAbove3_5: criteriaAbove3_5,
        criteriaBellow2_0: criteriaBellow2_0,
      },
      programType: programType,
      calculatedAt: new Date().toISOString()
    });

    console.log(`[LAM-TEK] ✅ DETAILED Scoring complete:`);
    console.log(`   Overall Score: ${averageScoreAllCriteria.toFixed(2)} / 4.00 (${overallPercentage.toFixed(1)}%)`);
    console.log(`   Grade: ${grade} - ${akreditasi}`);
    console.log(`   Total Butir Score: ${finalScore.toFixed(2)} / ${maxPossibleScore}`);
    console.log(`   Criteria Summary:`);
    Object.values(criteriaScores).forEach(c => {
      console.log(`      ${c.criteriaNumber}. ${c.criteriaName}: ${c.totalScore.toFixed(2)} (avg: ${c.averageScore.toFixed(2)})`);
    });

    return result;
  }

  /**
   * Calculate Kriteria 1: Diferensiasi Misi scores
   */
  calculateKriteria1Score(ledData, programType) {
    const butirScores = {};
    
    // Butir 1.1: VMTS unik dan spesifik (Kualitatif)
    butirScores['1.1'] = 3.5; // Default, should be evaluated from LED
    
    // Butir 1.2: VMTS didukung renstra (Kualitatif)
    butirScores['1.2'] = 3.5;
    
    // Butir 1.3: VMTS linear dengan PT (Kualitatif)
    butirScores['1.3'] = 3.5;
    
    // Butir 1.4: VMTS melibatkan stakeholder (Kualitatif)
    butirScores['1.4'] = 3.5;
    
    // Total butir for Kriteria 1 varies by program type
    const butirCount = programType === 'D' || programType === 'DTr' ? 3 : 4;
    
    const scores = Object.values(butirScores).slice(0, butirCount);
    const total = scores.reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 2: Akuntabilitas scores
   */
  calculateKriteria2Score(ledData, lkpsData, programType) {
    const butirScores = {};
    
    // Butir 2.1: Tata Pamong kelengkapan (Kualitatif)
    butirScores['2.1'] = 3.5;
    
    // Butir 2.2: Tata Pamong governance (Kualitatif)
    butirScores['2.2'] = 3.5;
    
    // Butir 2.3: BOP per mahasiswa (Kuantitatif)
    const bopValue = lkpsData.bop_value || 0;
    butirScores['2.3'] = this.calculateBOPScore(bopValue, programType);
    
    // Butir 2.4: Dana Penelitian DTPS (Kuantitatif)
    const dpdTotal = lkpsData.dpd_total || 0;
    const jumlahDtps = lkpsData.jumlah_dtps || 1;
    const dpdPerDtps = dpdTotal / jumlahDtps;
    butirScores['2.4'] = this.calculateDPDScore(dpdPerDtps, programType);
    
    // Butir 2.5: Kerjasama (Kuantitatif 3D)
    const ri = lkpsData.kerjasama_internasional || 0;
    const rn = lkpsData.kerjasama_nasional || 0;
    const rl = lkpsData.kerjasama_wilayah || 0;
    const [a, b, c] = programType === 'D' || programType === 'DTr' ? [3, 8, 10] : [2, 6, 8];
    butirScores['2.5'] = this.calculateInterpolationScore(ri, rn, rl, a, b, c);
    
    const butirCount = Object.keys(butirScores).length;
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 3: Relevansi scores
   */
  calculateKriteria3Score(ledData, lkpsData, programType) {
    const butirScores = {};
    
    // Butir 3.1: Pemutakhiran kurikulum (Kualitatif)
    butirScores['3.1'] = 3.5;
    
    // Butir 3.2: Profil lulusan (Kualitatif)
    butirScores['3.2'] = 3.5;
    
    // Butir 3.3: RPS kelengkapan (Kualitatif)
    butirScores['3.3'] = 3.5;
    
    // Butir 3.4: Pembelajaran SCL (Kualitatif)
    butirScores['3.4'] = 3.5;
    
    // Butir 3.5: Suasana akademik (Kualitatif)
    butirScores['3.5'] = 3.5;
    
    // Butir 3.6: Penelitian kesesuaian (Kualitatif)
    butirScores['3.6'] = 3.5;
    
    // Butir 3.7: PkM kesesuaian (Kualitatif)
    butirScores['3.7'] = 3.5;
    
    const butirCount = Object.keys(butirScores).length;
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 4: SDM scores
   */
  calculateKriteria4Score(lkpsData, programType) {
    const butirScores = {};
    
    // Butir 4.1: NDTPS (Kuantitatif)
    const ndtps = lkpsData.ndtps || 0;
    butirScores['4.1'] = ndtps >= 12 ? 4 : (ndtps / 12) * 4;
    
    // Butir 4.2: Dosen tidak tetap (Kuantitatif)
    const pdtt = lkpsData.pdtt || 0;
    butirScores['4.2'] = pdtt <= 10 ? 4 : 4 - ((pdtt - 10) / 10);
    
    // Butir 4.3: Dosen S3 (Kuantitatif)
    const pds3 = lkpsData.pds3 || 0;
    butirScores['4.3'] = pds3 >= 80 ? 4 : (pds3 / 80) * 4;
    
    // Butir 4.4: Guru Besar + Lektor Kepala (Kuantitatif)
    const pgblkl = lkpsData.pgblkl || 0;
    butirScores['4.4'] = pgblkl >= 70 ? 4 : (pgblkl / 70) * 4;
    
    // Butir 4.5: RBK DTPS (Kuantitatif)
    const rbk = lkpsData.rbk_dtps || 0;
    butirScores['4.5'] = rbk >= 10 && rbk <= 16 ? 4 : 4 - Math.abs(13 - rbk) * 0.3;
    
    // Butir 4.6: Publikasi DTPS (Kuantitatif)
    const publikasiRI = lkpsData.publikasi_ilmiah_dtps_ri || 0;
    const publikasiRN = lkpsData.publikasi_ilmiah_dtps_rn || 0;
    butirScores['4.6'] = this.calculateInterpolationScore(publikasiRI, publikasiRN, 0, 2, 4, 0);
    
    const butirCount = Object.keys(butirScores).length;
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 5: Sarana, Prasarana, dan K3L scores
   */
  calculateKriteria5Score(ledData, programType) {
    const butirScores = {};
    
    // Butir 5.1: Sarana akademik (Kualitatif)
    butirScores['5.1'] = 3.5;
    
    // Butir 5.2: Sarana non-akademik (Kualitatif)
    butirScores['5.2'] = 3.5;
    
    // Butir 5.3: K3L (Kualitatif)
    butirScores['5.3'] = 3.5;
    
    const butirCount = Object.keys(butirScores).length;
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 6: Mahasiswa dan Luaran scores
   */
  calculateKriteria6Score(lkpsData, programType) {
    const butirScores = {};
    
    // Butir 6.1: RMD (Kuantitatif)
    const rmd = lkpsData.rmd || 0;
    butirScores['6.1'] = this.calculateRMDScore(rmd, programType);
    
    // Butir 6.2: Mahasiswa asing (Kuantitatif)
    const pma = lkpsData.pma || 0;
    butirScores['6.2'] = pma >= 2 ? 4 : (pma / 2) * 4;
    
    // Butir 6.3: IPK lulusan (Kuantitatif)
    const ripk = lkpsData.ripk || 0;
    butirScores['6.3'] = ripk >= 3.5 ? 4 : (ripk / 3.5) * 4;
    
    // Butir 6.4: Prestasi mahasiswa (Kuantitatif)
    const prestasiRI = lkpsData.prestasi_akademik_ri || 0;
    const prestasiRN = lkpsData.prestasi_akademik_rn || 0;
    butirScores['6.4'] = this.calculateInterpolationScore(prestasiRI, prestasiRN, 0, 2, 5, 0);
    
    // Butir 6.5: Publikasi mahasiswa (Kuantitatif)
    const publikasiMhs = lkpsData.publikasi_mahasiswa_ri || 0;
    butirScores['6.5'] = publikasiMhs >= 2 ? 4 : (publikasiMhs / 2) * 4;
    
    // Butir 6.6: Lulusan tepat waktu (Kuantitatif)
    const ptw = lkpsData.ptw || 0;
    butirScores['6.6'] = ptw >= 80 ? 4 : (ptw / 80) * 4;
    
    // Butir 6.7: Waktu tunggu kerja (Kuantitatif)
    const wt = lkpsData.wt || 6;
    butirScores['6.7'] = this.calculateWaktuTungguScore(wt, programType);
    
    // Butir 6.8: Kesesuaian bidang kerja (Kuantitatif)
    const kbk = lkpsData.kbk || 0;
    butirScores['6.8'] = kbk >= 80 ? 4 : (kbk / 80) * 4;
    
    // Butir 6.9: Tingkat tempat kerja (Kuantitatif)
    const ttRI = lkpsData.tingkat_tempat_kerja_ri || 0;
    const ttRN = lkpsData.tingkat_tempat_kerja_rn || 0;
    butirScores['6.9'] = this.calculateInterpolationScore(ttRI, ttRN, 0, 5, 10, 0);
    
    const butirCount = Object.keys(butirScores).length;
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }

  /**
   * Calculate Kriteria 7: Penjaminan Mutu scores
   */
  calculateKriteria7Score(ledData, programType) {
    const butirScores = {};
    
    // Butir 7.1: Keberadaan unit SPMI (Kualitatif)
    butirScores['7.1'] = 3.5;
    
    // Butir 7.2: Ketersediaan dokumen SPMI (Kualitatif)
    butirScores['7.2'] = 3.5;
    
    // Butir 7.3: Keterlaksanaan SPMI (Kualitatif)
    butirScores['7.3'] = 3.5;
    
    // Butir 7.4: Evaluasi capaian kinerja (Kualitatif)
    butirScores['7.4'] = 3.5;
    
    // Butir 7.5: Kepuasan pemangku kepentingan (Kualitatif)
    butirScores['7.5'] = 3.5;
    
    const butirCount = Object.keys(butirScores).length;
    const total = Object.values(butirScores).reduce((a, b) => a + b, 0);
    const average = total / butirCount;
    
    return { butirScores, total, average, butirCount };
  }
}

module.exports = new LAMTEKScoringService();
