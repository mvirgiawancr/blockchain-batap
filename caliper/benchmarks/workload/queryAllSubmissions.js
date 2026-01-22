'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

/**
 * Workload module for querying all submissions
 */
class QueryAllSubmissionsWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }

    /**
     * Initialize the workload module
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
        const args = {
            contractId: this.contractId,
            contractFunction: 'QueryAllSubmissions',
            contractArguments: [],
            channel: this.channel,
            invokerIdentity: 'User1',
            timeout: 60,
            readOnly: true
        };

        await this.sutAdapter.sendRequests(args);
    }
}

/**
 * Create workload module
 */
function createWorkloadModule() {
    return new QueryAllSubmissionsWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
