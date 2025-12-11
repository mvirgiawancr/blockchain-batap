const userService = require('../services/userService');

const listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const users = await userService.listUsers({ role });
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  listUsers
};
