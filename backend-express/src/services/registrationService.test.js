/**
 * Registration Service Tests
 * Unit & integration tests for UPPS registration workflow
 */

const registrationService = require('./registrationService');

describe('Registration Service', () => {

  describe('validateUsernameAvailable', () => {

    it('returns {available:true} for fresh username', async () => {
      const result = await registrationService.validateUsernameAvailable('brandnewuser123');
      expect(result.available).toBe(true);
    });

    it('returns {available:false} for seeded user', async () => {
      const result = await registrationService.validateUsernameAvailable('upps_tip');
      expect(result.available).toBe(false);
    });

  });

});
