/**
 * Scoring Controller
 * Handles LAM-TEK 2025 scoring calculations and recalculations
 */

const fabricService = require('../services/fabricService');
const lamtekScoringService = require('../services/lamtekScoringService');
const logger = require('../utils/logger');

/**
 * Calculate or recalculate LAM-TEK scores for a submission
 */
const calculateScores = async (req, res, next) => {
  try {
    const { submissionId, programType } = req.body;

    logger.info(`Calculating scores for submission: ${submissionId}`);

    // Fetch submission from blockchain
    const submission = await fabricService.getSubmission(submissionId);

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${submissionId}`
      });
    }

    const aiPayload = submission.aiRecommendation || submission.ai;

    // Check if AI recommendation exists
    if (!aiPayload) {
      return res.status(400).json({
        error: 'AI analysis required',
        message: 'Submission must have AI analysis completed before scoring'
      });
    }

    if (!aiPayload.readyForScoring) {
      return res.status(400).json({
        error: 'Data incomplete',
        message: 'AI analysis indicates data is incomplete for scoring',
        details: aiPayload.notes
      });
    }

    // Extract data
    const ledData = aiPayload.ledCriteriaCoverage;
    const lkpsData = aiPayload.lkpsNumericData;
    const finalProgramType = programType || submission.programType || 'S';

    logger.info(`Calculating DETAILED LAM-TEK scores with programType: ${finalProgramType}`);

    // Calculate scores with detailed per-criteria breakdown
    const scoringResult = lamtekScoringService.calculateDetailedLAMTEKScores(
      ledData,
      lkpsData,
      finalProgramType
    );

    logger.info(`Scoring complete: Final Score = ${scoringResult.finalScore.toFixed(2)} / ${scoringResult.maxPossibleScore}`);

    // Update submission with new scoring result
    await fabricService.updateSubmission(
      submissionId,
      {
        scoringResult,
        status: 'under_review',
        updatedAt: new Date().toISOString()
      },
      { mspOrg: req.user?.msp_org }
    );

    res.json({
      success: true,
      message: 'Scores calculated successfully',
      scoring: {
        submissionId,
        programStudi: submission.programStudi,
        institusi: submission.institusi,
        programType: finalProgramType,
        finalScore: scoringResult.finalScore,
        maxPossibleScore: scoringResult.maxPossibleScore,
        percentage: scoringResult.percentage,
        akreditasi: scoringResult.akreditasi,
        criteriaScores: Object.values(scoringResult.criteriaScores).map(c => ({
          number: c.criteriaNumber,
          code: c.criteriaCode,
          name: c.criteriaName,
          totalScore: c.totalScore,
          averageScore: c.averageScore,
          butirCount: c.butirCount,
          maxPossibleScore: c.maxPossibleScore,
          percentage: c.percentage,
          butirScores: c.butirScores
        })),
        summary: scoringResult.summary,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Calculate scores error:', error);
    next(error);
  }
};

/**
 * Get scoring details for a submission
 */
const getScoringDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching scoring details for submission: ${id}`);

    const submission = await fabricService.getSubmission(id);

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`
      });
    }

    if (!submission.scoringResult) {
      return res.status(404).json({
        error: 'Scoring not available',
        message: 'This submission has not been scored yet'
      });
    }

    res.json({
      success: true,
      scoring: {
        submissionId: submission.id,
        programStudi: submission.programStudi,
        institusi: submission.institusi,
        programType: submission.programType,
        ...submission.scoringResult,
        submittedAt: submission.submittedAt,
        updatedAt: submission.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get scoring details error:', error);
    next(error);
  }
};

/**
 * Calculate custom scores with manual data input
 */
const calculateCustomScores = async (req, res, next) => {
  try {
    const { ledData, lkpsData, programType } = req.body;

    logger.info(`Calculating custom scores for programType: ${programType || 'S'}`);

    if (!lkpsData || Object.keys(lkpsData).length === 0) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'LKPS data is required for scoring'
      });
    }

    const finalProgramType = programType || 'S';

    // Calculate scores with detailed breakdown
    const scoringResult = lamtekScoringService.calculateDetailedLAMTEKScores(
      ledData || {},
      lkpsData,
      finalProgramType
    );

    logger.info(`Custom scoring complete: Final Score = ${scoringResult.finalScore.toFixed(2)} / ${scoringResult.maxPossibleScore}`);

    res.json({
      success: true,
      message: 'Custom scores calculated successfully',
      scoring: {
        programType: finalProgramType,
        finalScore: scoringResult.finalScore,
        maxPossibleScore: scoringResult.maxPossibleScore,
        percentage: scoringResult.percentage,
        akreditasi: scoringResult.akreditasi,
        criteriaScores: Object.values(scoringResult.criteriaScores).map(c => ({
          number: c.criteriaNumber,
          code: c.criteriaCode,
          name: c.criteriaName,
          totalScore: c.totalScore,
          averageScore: c.averageScore,
          butirCount: c.butirCount,
          maxPossibleScore: c.maxPossibleScore,
          percentage: c.percentage,
          butirScores: c.butirScores
        })),
        summary: scoringResult.summary,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Calculate custom scores error:', error);
    next(error);
  }
};

/**
 * Get scoring formulas and thresholds
 */
const getScoringInfo = async (req, res, next) => {
  try {
    const { programType } = req.query;

    logger.info(`Fetching scoring info for programType: ${programType || 'all'}`);

    const info = {
      lamtek2025: {
        version: '2025',
        totalCriteria: 7,
        criteria: [
          { number: 1, code: 'DM', name: 'Diferensiasi Misi' },
          { number: 2, code: 'AK', name: 'Akuntabilitas' },
          { number: 3, code: 'REL', name: 'Relevansi Pendidikan, Penelitian, dan PkM' },
          { number: 4, code: 'SDM', name: 'Sumber Daya Manusia' },
          { number: 5, code: 'SARPRAS', name: 'Sarana, Prasarana, dan K3L' },
          { number: 6, code: 'MHS', name: 'Mahasiswa dan Luaran Mahasiswa' },
          { number: 7, code: 'SPM', name: 'Sistem Penjaminan Mutu' }
        ]
      },
      programTypes: {
        'S': { name: 'Sarjana', butir: 60 },
        'M': { name: 'Magister', butir: 55 },
        'D': { name: 'Doktor', butir: 53 },
        'D1': { name: 'Diploma 1', butir: 56 },
        'D2': { name: 'Diploma 2', butir: 56 },
        'D3': { name: 'Diploma 3', butir: 56 },
        'STr': { name: 'Sarjana Terapan', butir: 64 },
        'MTr': { name: 'Magister Terapan', butir: 58 },
        'DTr': { name: 'Doktor Terapan', butir: 56 },
        'PPI': { name: 'Program Profesi/Internship', butir: 54 }
      },
      akreditasiCategories: {
        'Unggul': { minScore: 361 },
        'Baik Sekali': { minScore: 301, maxScore: 360 },
        'Baik': { minScore: 200, maxScore: 300 },
        'Tidak Terakreditasi': { maxScore: 199 }
      },
      thresholds: {
        bop: {
          lowLevel: { threshold: 40000000, scoreIfMet: 4 },
          highLevel: { threshold: 28000000, scoreIfMet: 4 }
        },
        dpd: {
          lowLevel: { threshold: 30000000, scoreIfMet: 4 },
          highLevel: { threshold: 20000000, scoreIfMet: 4 }
        },
        rmd: {
          S: { min: 15, max: 25, scoreIfOptimal: 4 },
          PPI: { min: 4, max: 10, scoreIfOptimal: 4 }
        },
        waktuTunggu: {
          vokasi: { threshold: 3, scoreIfMet: 4 },
          sarjana: { threshold: 6, scoreIfMet: 4 }
        }
      },
      formulas: {
        interpolation: '3.75 × ((A+B+(C/2))-(A×B)-((A×C)/2)-((B×C)/2)+((A×B×C)/2))',
        weightedAverage121: '(Score1 + 2×Score2 + Score3) / 4',
        weightedAverage122: '(Score1 + 2×Score2 + 2×Score3) / 5',
        simpleAverage: 'Sum of scores / Number of butir'
      }
    };

    if (programType && info.programTypes[programType]) {
      info.selectedProgramType = {
        type: programType,
        ...info.programTypes[programType]
      };
    }

    res.json({
      success: true,
      info
    });

  } catch (error) {
    logger.error('Get scoring info error:', error);
    next(error);
  }
};

/**
 * Manual scoring input by assessor/sekretariat/admin
 */
const manualScoring = async (req, res, next) => {
  try {
    const { submissionId, manualScores = {}, notes = '', programType } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    const submission = await fabricService.getSubmission(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Build scoringResult payload (manual)
    const criteriaScores = {};
    Object.keys(manualScores || {}).forEach((key) => {
      criteriaScores[key] = {
        manualScore: Number(manualScores[key]),
      };
    });

    const scoringResult = {
      manual: true,
      programType: programType || submission.programType || 'S',
      criteriaScores,
      notes: notes || '',
      calculatedBy: req.user?.username || 'assessor',
      calculatedAt: new Date().toISOString()
    };

    await fabricService.updateSubmission(
      submissionId,
      { scoringResult },
      { mspOrg: req.user?.msp_org }
    );

    res.json({
      success: true,
      message: 'Manual scoring saved',
      scoring: scoringResult
    });
  } catch (error) {
    logger.error('Manual scoring error:', error);
    next(error);
  }
};

module.exports = {
  calculateScores,
  getScoringDetails,
  calculateCustomScores,
  getScoringInfo,
  manualScoring
};
