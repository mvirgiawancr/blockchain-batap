import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    Submission,
    Document,
    AIRecommendation,
    Decision,
    SubmissionCreatedEvent,
    AIRecommendationAttachedEvent,
    SubmissionDecidedEvent,
    SubmissionDocumentsUpdatedEvent
} from './types';

@Info({ title: 'SubmissionContract', description: 'Smart contract for managing accreditation submissions' })
export class SubmissionContract extends Contract {

    /**
     * Initialize the ledger
     */
    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.info('============= START : Initialize Ledger ===========');
        console.info('Submission Contract initialized successfully');
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Create a new submission record
     * @param ctx - Transaction context
     * @param submissionId - Unique identifier for submission
     * @param programStudi - Program name
     * @param institusi - Institution name
     * @param documentsJson - JSON string of documents array
     */
    @Transaction()
    @Returns('string')
    public async CreateSubmission(
        ctx: Context,
        submissionId: string,
        programStudi: string,
        institusi: string,
        documentsJson: string
    ): Promise<string> {
        console.info('============= START : Create Submission ===========');

        // Check if submission already exists
        const exists = await this.SubmissionExists(ctx, submissionId);
        if (exists) {
            throw new Error(`Submission ${submissionId} already exists`);
        }

        const documents: Document[] = JSON.parse(documentsJson);

        // Use transaction timestamp for deterministic execution across peers
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const submission: Submission = {
            submissionId,
            programStudi,
            institusi,
            documents,
            status: 'under_review',
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
            docType: 'submission'
        };

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        // Emit event
        const event: SubmissionCreatedEvent = {
            submissionId,
            programStudi,
            institusi,
            at: submission.createdAt
        };
        ctx.stub.setEvent('SubmissionCreated', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Create Submission ===========');
        return JSON.stringify(submission);
    }

    /**
     * Attach AI analysis results to submission
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     * @param aiPayloadJson - JSON string with AI recommendation data
     */
    @Transaction()
    @Returns('string')
    public async AttachAIRecommendation(
        ctx: Context,
        submissionId: string,
        aiPayloadJson: string
    ): Promise<string> {
        console.info('============= START : Attach AI Recommendation ===========');

        const submission = await this.getSubmission(ctx, submissionId);
        const aiPayload: Partial<AIRecommendation> = JSON.parse(aiPayloadJson);

        // Use transaction timestamp for deterministic execution
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.ai = {
            scoreCompleteness: aiPayload.scoreCompleteness || 0,
            flags: aiPayload.flags || [],
            recommendations: aiPayload.recommendations || [],
            analyzedAt: timestamp
        };
        submission.updatedAt = timestamp;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        // Emit event
        const event: AIRecommendationAttachedEvent = {
            submissionId,
            score: submission.ai.scoreCompleteness,
            at: submission.updatedAt
        };
        ctx.stub.setEvent('AIRecommendationAttached', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Attach AI Recommendation ===========');
        return JSON.stringify(submission);
    }

    /**
     * Set approval/rejection decision
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     * @param decision - Decision (approved/rejected)
     * @param notes - Decision notes
     * @param decidedBy - Who made the decision
     */
    @Transaction()
    @Returns('string')
    public async SetDecision(
        ctx: Context,
        submissionId: string,
        decision: string,
        notes: string,
        decidedBy: string
    ): Promise<string> {
        console.info('============= START : Set Decision ===========');

        if (decision !== 'approved' && decision !== 'rejected') {
            throw new Error(`Invalid decision: ${decision}. Must be 'approved' or 'rejected'`);
        }

        const submission = await this.getSubmission(ctx, submissionId);

        // Use transaction timestamp for deterministic execution
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.status = decision as 'approved' | 'rejected';
        submission.decision = {
            result: decision as 'approved' | 'rejected',
            notes: notes || '',
            decidedBy: decidedBy || 'unknown',
            decidedAt: timestamp
        };
        submission.updatedAt = timestamp;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        // Emit event
        const event: SubmissionDecidedEvent = {
            submissionId,
            status: submission.status,
            at: submission.updatedAt
        };
        ctx.stub.setEvent('SubmissionDecided', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Set Decision ===========');
        return JSON.stringify(submission);
    }

    /**
     * Update documents (for revisions)
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     * @param newDocumentsJson - JSON string of new documents array
     */
    @Transaction()
    @Returns('string')
    public async UpdateDocuments(
        ctx: Context,
        submissionId: string,
        newDocumentsJson: string
    ): Promise<string> {
        console.info('============= START : Update Documents ===========');

        const submission = await this.getSubmission(ctx, submissionId);
        const newDocuments: Document[] = JSON.parse(newDocumentsJson);

        // Use transaction timestamp for deterministic execution
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // Increment version
        submission.version = (submission.version || 1) + 1;
        submission.documents = newDocuments;
        submission.status = 'under_review'; // Reset status for re-review
        submission.updatedAt = timestamp;

        // Archive old decision if exists
        if (submission.decision) {
            submission.previousDecisions = submission.previousDecisions || [];
            submission.previousDecisions.push(submission.decision);
            delete submission.decision;
        }

        // Clear AI recommendation for new analysis
        delete submission.ai;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        // Emit event
        const event: SubmissionDocumentsUpdatedEvent = {
            submissionId,
            version: submission.version,
            at: submission.updatedAt
        };
        ctx.stub.setEvent('SubmissionDocumentsUpdated', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Update Documents ===========');
        return JSON.stringify(submission);
    }

    /**
     * Query submission by ID
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     */
    @Transaction(false)
    @Returns('string')
    public async QuerySubmission(ctx: Context, submissionId: string): Promise<string> {
        const submission = await this.getSubmission(ctx, submissionId);
        return JSON.stringify(submission);
    }

    /**
     * Check if submission exists
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     */
    @Transaction(false)
    @Returns('boolean')
    public async SubmissionExists(ctx: Context, submissionId: string): Promise<boolean> {
        const submissionBytes = await ctx.stub.getState(submissionId);
        return submissionBytes && submissionBytes.length > 0;
    }

    /**
     * Query all submissions
     * @param ctx - Transaction context
     */
    @Transaction(false)
    @Returns('string')
    public async QueryAllSubmissions(ctx: Context): Promise<string> {
        const allResults: Submission[] = [];
        const iterator = await ctx.stub.getStateByRange('', '');

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            try {
                const record = JSON.parse(strValue);
                if (record.docType === 'submission') {
                    allResults.push(record);
                }
            } catch (err) {
                console.error('Error parsing record:', err);
            }
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(allResults);
    }

    /**
     * Query submissions by status
     * @param ctx - Transaction context
     * @param status - Status to filter by
     */
    @Transaction(false)
    @Returns('string')
    public async QuerySubmissionsByStatus(ctx: Context, status: string): Promise<string> {
        const queryString = {
            selector: {
                docType: 'submission',
                status: status
            }
        };

        return await this.getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    /**
     * Query submissions by institution
     * @param ctx - Transaction context
     * @param institusi - Institution name
     */
    @Transaction(false)
    @Returns('string')
    public async QuerySubmissionsByInstitusi(ctx: Context, institusi: string): Promise<string> {
        const queryString = {
            selector: {
                docType: 'submission',
                institusi: institusi
            }
        };

        return await this.getQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    /**
     * Get submission history
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     */
    @Transaction(false)
    @Returns('string')
    public async GetSubmissionHistory(ctx: Context, submissionId: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(submissionId);
        const allResults: any[] = [];

        let result = await iterator.next();
        while (!result.done) {
            const record: any = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete
            };

            if (result.value.value && result.value.value.toString()) {
                try {
                    record.value = JSON.parse(result.value.value.toString());
                } catch (err) {
                    console.error('Error parsing history record:', err);
                    record.value = result.value.value.toString();
                }
            }

            allResults.push(record);
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(allResults);
    }

    /**
     * Helper: Get submission or throw error
     */
    private async getSubmission(ctx: Context, submissionId: string): Promise<Submission> {
        const submissionBytes = await ctx.stub.getState(submissionId);
        if (!submissionBytes || submissionBytes.length === 0) {
            throw new Error(`Submission ${submissionId} does not exist`);
        }
        return JSON.parse(submissionBytes.toString());
    }

    /**
     * Helper: Execute query and return results
     */
    private async getQueryResultForQueryString(ctx: Context, queryString: string): Promise<string> {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const allResults: Submission[] = [];

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            try {
                const record = JSON.parse(strValue);
                allResults.push(record);
            } catch (err) {
                console.error('Error parsing query result:', err);
            }
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(allResults);
    }
}
