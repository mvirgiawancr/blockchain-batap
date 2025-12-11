/**
 * Assessor Controller
 * Handles assessor-related operations
 */

const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Get all assessors
 * GET /api/v1/assessors
 */
exports.getAllAssessors = async (req, res) => {
  try {
    // Fetch from database
    const result = await query(
      `SELECT id, username, name, institution, created_at 
       FROM users 
       WHERE role IN ($1, $2) AND is_active = true 
       ORDER BY name`,
      ['asesor', 'assessor']
    );

    const assessors = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      fullName: row.name,
      institution: row.institution,
      // Add default values for compatibility
      expertise: row.institution || '',
      rating: 0,
      totalAssignments: 0
    }));

    logger.info(`Retrieved ${assessors.length} assessors`);
    res.json({
      success: true,
      data: assessors
    });
  } catch (error) {
    logger.error('Error getting assessors:', error);
    res.status(500).json({
      error: 'Failed to retrieve assessors',
      message: error.message
    });
  }
};

/**
 * Get assessor by ID
 * GET /api/v1/assessors/:id
 */
exports.getAssessorById = async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Fetch from database
    const assessor = {
      id: id,
      name: 'Dr. Ahmad Fauzi',
      fullName: 'Dr. Ahmad Fauzi, M.T.',
      institution: 'Institut Teknologi Bandung',
      expertise: 'Teknik Informatika',
      rating: 4.8,
      totalAssignments: 12,
      email: 'ahmad.fauzi@itb.ac.id',
      phone: '+6281234567890'
    };

    res.json(assessor);
  } catch (error) {
    logger.error('Error getting assessor:', error);
    res.status(500).json({
      error: 'Failed to retrieve assessor',
      message: error.message
    });
  }
};
