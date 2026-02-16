'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

/**
 * Workload module for querying single submissions by ID.
 * Uses a shared file to pass IDs from create workload, or queries one-by-one.
 */
class QuerySubmissionWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.submissionIds = [];
        this.txIndex = 0;
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex = workerIndex;
        this.contractId = roundArguments.contractId;
        this.channel = roundArguments.channel;

        // Try to read IDs from shared file (written by createSubmission)
        const fs = require('fs');
        const path = require('path');
        const idFile = path.join(__dirname, '..', '.submission-ids.json');
        
        try {
            if (fs.existsSync(idFile)) {
                const data = JSON.parse(fs.readFileSync(idFile, 'utf8'));
                this.submissionIds = data.ids || [];
                console.log(`Worker ${workerIndex}: Loaded ${this.submissionIds.length} IDs from file`);
            }
        } catch (error) {
            console.log(`Worker ${workerIndex}: Could not read ID file: ${error.message}`);
        }

        // Fallback: query a single known submission to verify connectivity
        if (this.submissionIds.length === 0) {
            console.log(`Worker ${workerIndex}: No ID file found, trying to query a few known IDs...`);
            
            // Try querying individual IDs that might exist
            const testIds = [];
            for (let w = 0; w < totalWorkers; w++) {
                for (let t = 1; t <= 5; t++) {
                    testIds.push(`BENCH-W${w}-T${t}`);
                }
            }
            
            for (const testId of testIds) {
                try {
                    const queryArgs = {
                        contractId: this.contractId,
                        contractFunction: 'QuerySubmission',
                        contractArguments: [testId],
                        channel: this.channel,
                        invokerIdentity: 'User1',
                        timeout: 10,
                        readOnly: true
                    };
                    const result = await this.sutAdapter.sendRequests(queryArgs);
                    if (result && result.status === 'success') {
                        this.submissionIds.push(testId);
                    }
                } catch (e) {
                    // ID doesn't exist, skip
                }
            }
            
            if (this.submissionIds.length > 0) {
                console.log(`Worker ${workerIndex}: Found ${this.submissionIds.length} valid IDs via probing`);
            }
        }

        // Final fallback: generate IDs matching the create pattern file
        if (this.submissionIds.length === 0) {
            console.log(`Worker ${workerIndex}: Using generated fallback IDs (may have some misses)`);
            const txPerWorker = Math.ceil(2000 / totalWorkers);
            for (let w = 0; w < totalWorkers; w++) {
                for (let t = 1; t <= txPerWorker; t++) {
                    this.submissionIds.push(`BENCH-W${w}-T${t}`);
                }
            }
        }
    }

    async submitTransaction() {
        this.txIndex++;
        const submissionId = this.submissionIds[this.txIndex % this.submissionIds.length];

        const args = {
            contractId: this.contractId,
            contractFunction: 'QuerySubmission',
            contractArguments: [submissionId],
            channel: this.channel,
            invokerIdentity: 'User1',
            timeout: 30,
            readOnly: true
        };

        await this.sutAdapter.sendRequests(args);
    }
}

function createWorkloadModule() {
    return new QuerySubmissionWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
