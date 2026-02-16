'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const fs = require('fs');
const path = require('path');

/**
 * Workload module for creating submissions.
 * Saves created IDs to a shared file for the query workload to use.
 */
class CreateSubmissionWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.txIndex = 0;
        this.createdIds = [];
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex = workerIndex;
        this.totalWorkers = totalWorkers;
        this.contractId = roundArguments.contractId;
        this.channel = roundArguments.channel;
        this.runId = Date.now().toString(36);
        console.log(`Worker ${workerIndex}: Using RUN_ID=${this.runId}`);
    }

    async submitTransaction() {
        this.txIndex++;
        const submissionId = `B-${this.runId}-W${this.workerIndex}-T${this.txIndex}`;
        this.createdIds.push(submissionId);
        
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

    async cleanupWorkloadModule() {
        // Save created IDs to shared file for query workload
        const idFile = path.join(__dirname, '..', '.submission-ids.json');
        try {
            let existingIds = [];
            if (fs.existsSync(idFile)) {
                const data = JSON.parse(fs.readFileSync(idFile, 'utf8'));
                existingIds = data.ids || [];
            }
            const allIds = [...existingIds, ...this.createdIds];
            fs.writeFileSync(idFile, JSON.stringify({ ids: allIds, timestamp: Date.now() }));
            console.log(`Worker ${this.workerIndex}: Saved ${this.createdIds.length} IDs to file (total: ${allIds.length})`);
        } catch (error) {
            console.log(`Worker ${this.workerIndex}: Could not save IDs: ${error.message}`);
        }
    }
}

function createWorkloadModule() {
    return new CreateSubmissionWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
