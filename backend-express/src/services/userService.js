const { query } = require('../config/database');

class UserService {
  async listUsers({ role } = {}) {
    const params = [];
    let sql = `SELECT id, username, name, role, msp_org FROM users`;
    if (role) {
      params.push(role);
      sql += ` WHERE role = $1`;
    }
    sql += ` ORDER BY username ASC`;
    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = new UserService();
