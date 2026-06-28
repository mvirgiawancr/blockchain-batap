const jwt = require('jsonwebtoken');
const config = require('../config');

function issue(payload) {
  return jwt.sign(payload, config.resubmitToken.secret, {
    expiresIn: config.resubmitToken.expiresIn,
  });
}

function verify(token) {
  return jwt.verify(token, config.resubmitToken.secret);
}

module.exports = { issue, verify };
