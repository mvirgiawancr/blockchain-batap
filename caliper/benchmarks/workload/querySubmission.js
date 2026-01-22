'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

/**
 * Workload module for querying single submissions
 */
class QuerySubmissionWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.submissionIds = [];
        this.txIndex = 0;
    }

    /**
     * Initialize the workload module
     */
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex = workerIndex;
        this.contractId = roundArguments.contractId;
        this.channel = roundArguments.channel;
        
        // First, query all existing submissions to get IDs
        const queryArgs = {
            contractId: this.contractId,
            contractFunction: 'QueryAllSubmissions',
            contractArguments: [],
            channel: this.channel,
            invokerIdentity: 'User1',
            timeout: 60,
            readOnly: true
        };

        try {
            const result = await this.sutAdapter.sendRequests(queryArgs);
            if (result && result.status === 'success') {
                const submissions = JSON.parse(result.result.toString());
                this.submissionIds = submissions.map(s => s.submissionId);
                console.log(`Worker ${workerIndex}: Found ${this.submissionIds.length} submissions to query`);
            }
        } catch (error) {
            console.log(`Worker ${workerIndex}: Could not fetch existing submissions, will create dummy IDs`);
            // Fallback: create dummy submission IDs based on benchmark naming convention
            for (let i = 0; i < 100; i++) {
                this.submissionIds.push(`BENCH-0-${i + 1}-0`);
            }
        }
    }

    /**
     * Submit a transaction
     */
    async submitTransaction() {
        this.txIndex++;
        
        // Cycle through available submission IDs
        const submissionId = this.submissionIds.length > 0 
            ? this.submissionIds[this.txIndex % this.submissionIds.length]
            : `BENCH-0-1-0`;

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

/**
 * Create workload module
 */
function createWorkloadModule() {
    return new QuerySubmissionWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
