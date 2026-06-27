const { pool } = require('../config/database');

exports.listInstitutions = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name FROM institutions WHERE is_active = TRUE ORDER BY name`
  );
  res.json(rows);
};

exports.listProgramStudi = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name FROM program_studi WHERE is_active = TRUE ORDER BY name`
  );
  res.json(rows);
};

exports.listJenjang = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT code, label, full_name FROM jenjang WHERE is_active = TRUE ORDER BY level_order`
  );
  res.json(rows);
};
