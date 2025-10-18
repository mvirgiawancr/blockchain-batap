/*
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Submission Contract - Main Entry Point
 * This file exports the chaincode contract for Hyperledger Fabric
 */

'use strict';

// Import from the dist folder (compiled TypeScript)
const { SubmissionContract } = require('./dist/index');

module.exports.SubmissionContract = SubmissionContract;
module.exports.contracts = [SubmissionContract];
