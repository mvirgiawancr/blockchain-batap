'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

/**
 * Workload module for creating submissions
 */
class CreateSubmissionWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.txIndex = 0;
    }

    /**
     * Initialize the workload module
     * @param {number} workerIndex - Worker index
     * @param {number} totalWorkers - Total number of workers
     * @param {number} roundIndex - Round index
     * @param {object} roundArguments - Round arguments from config
     * @param {object} sutAdapter - SUT adapter
     * @param {object} sutContext - SUT context
     */
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex = workerIndex;
        this.contractId = roundArguments.contractId;
        this.channel = roundArguments.channel;
    }

    /**
     * Submit a transaction
     */
    async submitTransaction() {
        this.txIndex++;
        const timestamp = Date.now();
        const submissionId = `BENCH-${this.workerIndex}-${this.txIndex}-${timestamp}`;
        
        // Create submission data that matches the chaincode requirements
        const submissionData = {
            programStudi: `Program Studi Benchmark ${this.txIndex}`,
            institusi: `Institusi Benchmark ${this.workerIndex}`,
            documents: [
                {
                    docType: 'LED',
                    filename: 'led-benchmark.pdf',
                    hash: `hash-led-${submissionId}`,
                    uploadedAt: new Date().toISOString()
                },
                {
                    docType: 'LKPS',
                    filename: 'lkps-benchmark.xlsx',
                    hash: `hash-lkps-${submissionId}`,
                    uploadedAt: new Date().toISOString()
                }
            ],
            status: 'under_review',
            submittedBy: 'caliper-benchmark',
            submittedByOrg: 'UPPSMSP',
            programType: 'Sarjana'
        };

        const args = {
            contractId: this.contractId,
            contractFunction: 'CreateSubmission',
            contractArguments: [submissionId, JSON.stringify(submissionData)],
            channel: this.channel,
            invokerIdentity: 'User1',
            timeout: 60
        };

        await this.sutAdapter.sendRequests(args);
    }
}

/**
 * Create workload module
 */
function createWorkloadModule() {
    return new CreateSubmissionWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
