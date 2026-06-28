// scripts/smoke-test-signing.js
// Verifies per-user signing end-to-end:
// 1. Loads smoke.test3 credentials from DB
// 2. Submits CreateSubmission via fabricGatewayService (signed as user)
// 3. Queries the submission back and prints the X.509 audit field

const fabricGatewayService = require('../src/services/fabricGatewayService');

(async () => {
  const { v4: uuidv4 } = require('uuid');
  const { query } = require('../src/config/database');

  // Get smoke.test3 user id
  const res = await query("SELECT id FROM users WHERE username = $1", ['smoke.test3']);
  if (res.rows.length === 0) {
    console.error('FAIL: smoke.test3 not found in DB');
    process.exit(1);
  }
  const userId = res.rows[0].id;
  console.log(`User ID: ${userId}`);

  const submissionId = 'SMOKE-' + uuidv4().slice(0, 8);
  const submissionObject = {
    programStudi: 'Teknik Informatika',
    institusi: 'UPPS Smoke',
    documents: [],
    status: 'under_review',
  };

  console.log(`\n--- Submitting CreateSubmission as user ${userId} ---`);
  console.log(`submissionId: ${submissionId}`);
  try {
    const result = await fabricGatewayService.submitTransaction(
      userId,
      'CreateSubmission',
      [submissionId, JSON.stringify(submissionObject)]
    );
    console.log('Submit result:', JSON.stringify(result).slice(0, 200));
  } catch (err) {
    console.error('FAIL: submit threw:', err.message);
    process.exit(1);
  }

  console.log(`\n--- Querying back to verify X.509 audit field ---`);
  try {
    const stored = await fabricGatewayService.evaluateTransaction(
      userId,
      'QuerySubmission',
      [submissionId]
    );
    const obj = typeof stored === 'string' ? JSON.parse(stored) : stored;
    console.log('invokedByX509:', obj.invokedByX509);
    console.log('updatedByX509:', obj.updatedByX509);
    console.log('submittedByMsp:', obj.submittedByMsp);

    if (obj.invokedByX509 && obj.invokedByX509.includes('CN=smoke.test3')) {
      console.log('\n✅ SMOKE TEST PASSED: per-user X.509 audit field recorded on-chain');
    } else {
      console.log('\n❌ SMOKE TEST FAILED: X.509 field missing or wrong');
      process.exit(1);
    }
  } catch (err) {
    console.error('FAIL: query threw:', err.message);
    process.exit(1);
  }
})();
