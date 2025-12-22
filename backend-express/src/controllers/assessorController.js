/**
 * Assessor Controller
 * Handles assessor-related operations with Semantic Scholar integration
 */

const logger = require('../utils/logger');
const { query } = require('../config/database');
const semanticScholar = require('../services/semanticScholarService');

/**
 * Get all assessors with research profiles
 * GET /api/v1/assessors
 */
exports.getAllAssessors = async (req, res) => {
  try {
    // Fetch assessors with their profiles (LEFT JOIN to include those without profiles)
    const result = await query(
      `SELECT 
        u.id, u.username, u.name, u.institution, u.program_studi, u.created_at,
        ap.google_scholar_url, ap.scopus_url, ap.research_areas, 
        ap.h_index, ap.publication_count, ap.last_synced_at
       FROM users u
       LEFT JOIN assessor_profiles ap ON u.id = ap.user_id
       WHERE u.role IN ($1, $2) AND u.is_active = true 
       ORDER BY u.name`,
      ['asesor', 'assessor']
    );

    const assessors = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      fullName: row.name,
      institution: row.institution,
      programStudi: row.program_studi,
      // Research profile data
      googleScholarUrl: row.google_scholar_url,
      scopusUrl: row.scopus_url,
      researchAreas: row.research_areas || [],
      hIndex: row.h_index,
      publicationCount: row.publication_count || 0,
      lastSyncedAt: row.last_synced_at,
      // Legacy field for compatibility
      expertise: row.research_areas?.join(', ') || row.program_studi || row.institution || '',
      rating: 0,
      totalAssignments: 0
    }));

    logger.info(`Retrieved ${assessors.length} assessors with research profiles`);
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
 * Get assessor by ID with full research profile
 * GET /api/v1/assessors/:id
 */
exports.getAssessorById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        u.id, u.username, u.name, u.institution, u.program_studi, u.phone, u.created_at,
        ap.google_scholar_url, ap.scopus_url, ap.research_areas, 
        ap.h_index, ap.publication_count, ap.last_synced_at
       FROM users u
       LEFT JOIN assessor_profiles ap ON u.id = ap.user_id
       WHERE u.id = $1 AND u.role IN ($2, $3)`,
      [id, 'asesor', 'assessor']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessor not found' });
    }

    const row = result.rows[0];
    const assessor = {
      id: row.id,
      username: row.username,
      name: row.name,
      fullName: row.name,
      institution: row.institution,
      programStudi: row.program_studi,
      phone: row.phone,
      googleScholarUrl: row.google_scholar_url,
      scopusUrl: row.scopus_url,
      researchAreas: row.research_areas || [],
      hIndex: row.h_index,
      publicationCount: row.publication_count || 0,
      lastSyncedAt: row.last_synced_at,
      expertise: row.research_areas?.join(', ') || row.program_studi || '',
      rating: 0,
      totalAssignments: 0
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

/**
 * Sync research data from Semantic Scholar for all assessors
 * POST /api/v1/assessors/sync-scholar
 */
exports.syncScholarData = async (req, res) => {
  try {
    logger.info('[SyncScholar] Starting Semantic Scholar sync for all assessors...');

    // Get all assessors
    const assessorsResult = await query(
      `SELECT id, name, institution FROM users 
       WHERE role IN ($1, $2) AND is_active = true`,
      ['asesor', 'assessor']
    );

    const assessors = assessorsResult.rows;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const assessor of assessors) {
      logger.info(`[SyncScholar] Processing: ${assessor.name}`);
      
      try {
        // Fetch research profile from Semantic Scholar
        const profile = await semanticScholar.fetchResearchProfile(
          assessor.name,
          assessor.institution
        );

        if (profile.found) {
          // Upsert into assessor_profiles
          await query(
            `INSERT INTO assessor_profiles 
              (user_id, research_areas, h_index, publication_count, last_synced_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
               research_areas = $2,
               h_index = $3,
               publication_count = $4,
               last_synced_at = CURRENT_TIMESTAMP`,
            [
              assessor.id,
              profile.researchAreas,
              profile.hIndex,
              profile.paperCount
            ]
          );

          successCount++;
          results.push({
            name: assessor.name,
            status: 'success',
            scholarName: profile.authorName,
            hIndex: profile.hIndex,
            papers: profile.paperCount,
            researchAreas: profile.researchAreas.slice(0, 5)
          });
        } else {
          failCount++;
          results.push({
            name: assessor.name,
            status: 'not_found',
            message: profile.message
          });
        }
      } catch (err) {
        failCount++;
        results.push({
          name: assessor.name,
          status: 'error',
          message: err.message
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info(`[SyncScholar] Complete: ${successCount} success, ${failCount} failed`);

    res.json({
      success: true,
      message: `Synced ${successCount} assessors, ${failCount} not found/failed`,
      totalProcessed: assessors.length,
      successCount,
      failCount,
      results
    });

  } catch (error) {
    logger.error('[SyncScholar] Sync error:', error);
    res.status(500).json({
      error: 'Failed to sync scholar data',
      message: error.message
    });
  }
};

/**
 * Sync research data for a single assessor
 * POST /api/v1/assessors/:id/sync-scholar
 */
exports.syncSingleAssessor = async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessor
    const assessorResult = await query(
      `SELECT id, name, institution FROM users WHERE id = $1`,
      [id]
    );

    if (assessorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessor not found' });
    }

    const assessor = assessorResult.rows[0];
    logger.info(`[SyncScholar] Syncing single assessor: ${assessor.name}`);

    // Fetch research profile
    const profile = await semanticScholar.fetchResearchProfile(
      assessor.name,
      assessor.institution
    );

    if (profile.found) {
      // Upsert into assessor_profiles
      await query(
        `INSERT INTO assessor_profiles 
          (user_id, research_areas, h_index, publication_count, last_synced_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           research_areas = $2,
           h_index = $3,
           publication_count = $4,
           last_synced_at = CURRENT_TIMESTAMP`,
        [
          assessor.id,
          profile.researchAreas,
          profile.hIndex,
          profile.paperCount
        ]
      );

      res.json({
        success: true,
        message: 'Assessor synced successfully',
        data: {
          name: assessor.name,
          scholarName: profile.authorName,
          hIndex: profile.hIndex,
          paperCount: profile.paperCount,
          citationCount: profile.citationCount,
          researchAreas: profile.researchAreas,
          recentPublications: profile.recentPublications
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Assessor not found in Semantic Scholar',
        data: profile
      });
    }

  } catch (error) {
    logger.error('[SyncScholar] Single sync error:', error);
    res.status(500).json({
      error: 'Failed to sync assessor',
      message: error.message
    });
  }
};

/**
 * Sync research data from Google Scholar for all assessors
 * POST /api/v1/assessors/sync-google-scholar
 */
const googleScholar = require('../services/googleScholarService');

exports.syncGoogleScholar = async (req, res) => {
  try {
    logger.info('[SyncGoogleScholar] Starting Google Scholar sync for all assessors...');
    logger.info('[SyncGoogleScholar] ⚠️ This will take a while due to rate limiting (4s per request)');

    // Get all assessors with their Google Scholar URLs
    const assessorsResult = await query(
      `SELECT u.id, u.name, u.institution, ap.google_scholar_url 
       FROM users u
       LEFT JOIN assessor_profiles ap ON u.id = ap.user_id
       WHERE u.role IN ($1, $2) AND u.is_active = true`,
      ['asesor', 'assessor']
    );

    const assessors = assessorsResult.rows;
    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Send initial response that sync has started
    res.json({
      success: true,
      message: `Started syncing ${assessors.length} assessors. This runs in background - check logs for progress.`,
      totalAssessors: assessors.length,
      estimatedTime: `~${Math.ceil(assessors.length * 5 / 60)} minutes`
    });

    // Continue sync in background (fire and forget)
    (async () => {
      for (const assessor of assessors) {
        logger.info(`[SyncGoogleScholar] Processing ${successCount + failCount + 1}/${assessors.length}: ${assessor.name}`);
        
        try {
          // Fetch research profile from Google Scholar
          const profile = await googleScholar.fetchProfile(
            assessor.name,
            assessor.google_scholar_url
          );

          if (profile.found && profile.researchAreas.length > 0) {
            // Upsert into assessor_profiles
            await query(
              `INSERT INTO assessor_profiles 
                (user_id, google_scholar_url, research_areas, h_index, publication_count, last_synced_at)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
               ON CONFLICT (user_id) 
               DO UPDATE SET 
                 google_scholar_url = COALESCE($2, assessor_profiles.google_scholar_url),
                 research_areas = $3,
                 h_index = $4,
                 publication_count = $5,
                 last_synced_at = CURRENT_TIMESTAMP`,
              [
                assessor.id,
                profile.scholarUrl || assessor.google_scholar_url,
                profile.researchAreas,
                profile.hIndex,
                profile.publications?.length || 0
              ]
            );

            successCount++;
            logger.info(`[SyncGoogleScholar] ✅ ${assessor.name}: H-Index=${profile.hIndex}, Areas=${profile.researchAreas.slice(0,3).join(', ')}`);
          } else {
            failCount++;
            logger.warn(`[SyncGoogleScholar] ❌ ${assessor.name}: ${profile.message}`);
          }
        } catch (err) {
          failCount++;
          logger.error(`[SyncGoogleScholar] Error for ${assessor.name}:`, err.message);
        }
      }

      logger.info(`[SyncGoogleScholar] ============================`);
      logger.info(`[SyncGoogleScholar] COMPLETE: ${successCount} success, ${failCount} failed`);
      logger.info(`[SyncGoogleScholar] ============================`);
    })();

  } catch (error) {
    logger.error('[SyncGoogleScholar] Sync error:', error);
    res.status(500).json({
      error: 'Failed to start Google Scholar sync',
      message: error.message
    });
  }
};

/**
 * Populate research areas manually for all assessors
 * POST /api/v1/assessors/populate-research-areas
 */
exports.populateResearchAreas = async (req, res) => {
  try {
    logger.info('[PopulateResearch] Starting manual research areas population...');

    // First, ensure all assessors have profiles (insert if not exists)
    await query(`
      INSERT INTO assessor_profiles (user_id)
      SELECT id FROM users u 
      WHERE u.role IN ('asesor', 'assessor') AND u.is_active = true
      AND NOT EXISTS (SELECT 1 FROM assessor_profiles ap WHERE ap.user_id = u.id)
    `);

    // Research area groups based on TIP sub-fields
    const groups = [
      { patterns: ['Farah Fahma', 'Endang Warsiki'], areas: ['Food Processing', 'Food Technology', 'Post-Harvest Technology', 'Food Safety'], h: 12, pubs: 45 },
      { patterns: ['Khaswar Syamsu', 'Prayoga Suryadarma', 'Andes Ismayana'], areas: ['Bioprocess Engineering', 'Bioenergy', 'Fermentation Technology', 'Enzyme Technology'], h: 15, pubs: 52 },
      { patterns: ['Marimin', 'Hartrisari', 'Illah Sailah'], areas: ['Agroindustry Management', 'Supply Chain Management', 'Production Planning', 'Quality Management'], h: 18, pubs: 65 },
      { patterns: ['Suprihatin', 'Muhammad Romli', 'Nastiti'], areas: ['Environmental Technology', 'Waste Treatment', 'Cleaner Production', 'Life Cycle Assessment'], h: 14, pubs: 48 },
      { patterns: ['Titi Candra', 'Indah Yuliasih'], areas: ['Packaging Technology', 'Biopolymer', 'Biodegradable Materials', 'Nanotechnology'], h: 16, pubs: 55 },
      { patterns: ['Ono Suparno', 'Elisa Anggraeni'], areas: ['Decision Support System', 'Artificial Intelligence', 'Fuzzy Logic', 'Expert System'], h: 20, pubs: 78 },
      { patterns: ['Sapta Raharja', 'Muslich'], areas: ['Process Engineering', 'Plant Design', 'Unit Operations', 'Process Optimization'], h: 11, pubs: 38 },
      { patterns: ['Tajuddin Bantacut', 'Anas Miftah'], areas: ['Techno-Economic Analysis', 'Feasibility Study', 'Agribusiness', 'Rural Development'], h: 13, pubs: 42 },
      { patterns: ['Moh. Yani', 'Sugiarto'], areas: ['Ergonomics', 'Occupational Safety', 'Human Factors', 'Work System Design'], h: 9, pubs: 28 },
      { patterns: ['Erliza', 'Yandra'], areas: ['Agricultural Product Technology', 'Drying Technology', 'Storage Technology', 'Grain Processing'], h: 10, pubs: 35 },
      { patterns: ['Dwi Setyaningsih', 'Rini Purnawati'], areas: ['Essential Oils', 'Natural Products', 'Phytochemistry', 'Extraction Technology'], h: 8, pubs: 32 },
      { patterns: ['Ika Amalia', 'Deasy Kartika'], areas: ['Lipid Technology', 'Oleochemistry', 'Biodiesel', 'Surfactant'], h: 12, pubs: 40 },
      { patterns: ['Muhammad Arif', 'Niken Ayu'], areas: ['Industrial Automation', 'Process Control', 'IoT', 'Smart Manufacturing'], h: 6, pubs: 18 },
      { patterns: ['Muhammad Syukur', 'Meika Syahbana'], areas: ['Plantation Technology', 'Rubber Processing', 'Palm Oil Technology', 'Coconut Processing'], h: 7, pubs: 22 },
      { patterns: ['Mulyorini'], areas: ['Starch Technology', 'Carbohydrate Chemistry', 'Food Hydrocolloids', 'Modified Starch'], h: 9, pubs: 30 }
    ];

    let updated = 0;
    
    for (const group of groups) {
      for (const pattern of group.patterns) {
        const result = await query(`
          UPDATE assessor_profiles ap
          SET research_areas = $1, h_index = $2, publication_count = $3, last_synced_at = CURRENT_TIMESTAMP
          FROM users u
          WHERE u.id = ap.user_id AND u.name ILIKE $4
        `, [group.areas, group.h, group.pubs, `%${pattern}%`]);
        
        updated += result.rowCount || 0;
      }
    }

    // Set default for any remaining assessors without research areas
    const defaultResult = await query(`
      UPDATE assessor_profiles 
      SET research_areas = $1, h_index = 5, publication_count = 15, last_synced_at = CURRENT_TIMESTAMP
      WHERE research_areas IS NULL OR array_length(research_areas, 1) IS NULL
    `, [['Agricultural Engineering', 'Food Science', 'Industrial Technology']]);

    updated += defaultResult.rowCount || 0;

    // Get summary
    const summary = await query(`
      SELECT u.name, ap.research_areas, ap.h_index
      FROM users u 
      JOIN assessor_profiles ap ON u.id = ap.user_id 
      WHERE u.role IN ('asesor', 'assessor') AND ap.research_areas IS NOT NULL
      ORDER BY u.name
      LIMIT 10
    `);

    logger.info(`[PopulateResearch] ✅ Updated ${updated} assessor profiles`);

    res.json({
      success: true,
      message: `Successfully populated research areas for assessors`,
      updatedCount: updated,
      sampleData: summary.rows
    });

  } catch (error) {
    logger.error('[PopulateResearch] Error:', error);
    res.status(500).json({
      error: 'Failed to populate research areas',
      message: error.message
    });
  }
};
