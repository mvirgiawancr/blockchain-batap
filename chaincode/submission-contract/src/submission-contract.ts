import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    Submission,
    Document,
    AIRecommendation,
    Decision,
    AssessorOffer,
    AKAssessment,
    SubmissionCreatedEvent,
    AIRecommendationAttachedEvent,
    SubmissionDecidedEvent,
    SubmissionDocumentsUpdatedEvent,
    ScoringUpdatedEvent,
    SubmissionAssignedEvent,
    AssessorOfferEvent,
    AssessorResponseEvent,
    UPPSResponseEvent,
    AKAssessmentSubmittedEvent,
    AKConsistencyCheckedEvent
} from './types';

@Info({ title: 'SubmissionContract', description: 'Smart contract for managing accreditation submissions' })
export class SubmissionContract extends Contract {

    /**
     * Validate that the invoker belongs to one of the allowed MSPs
     */
    private assertMSP(ctx: Context, allowedMSPs: string[], action: string) {
        const mspId = ctx.clientIdentity.getMSPID();
        if (!allowedMSPs.includes(mspId)) {
            throw new Error(`Access denied for ${action}. Required MSPs: ${allowedMSPs.join(', ')}, but got ${mspId}`);
        }
        return mspId;
    }

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
     * @param submissionJson - Full submission JSON (includes programStudi, institusi, documents, ai, scoring, etc)
     */
    @Transaction()
    @Returns('string')
    public async CreateSubmission(
        ctx: Context,
        submissionId: string,
        submissionJson: string
    ): Promise<string> {
        console.info('============= START : Create Submission ===========');
        console.info(`Creating submission: ${submissionId}`);
        console.info(`Submission JSON length: ${submissionJson.length}`);

        // Only UPPS (and optionally Sekretariat) can create submissions
        const mspId = this.assertMSP(ctx, ['UPPSMSP', 'SekadminMSP'], 'CreateSubmission');

        // Check if submission already exists
        const exists = await this.SubmissionExists(ctx, submissionId);
        if (exists) {
            throw new Error(`Submission ${submissionId} already exists`);
        }

        // Parse full submission JSON
        const submissionData = JSON.parse(submissionJson);

        // Use transaction timestamp for deterministic execution across peers
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const submission: Submission = {
            submissionId,
            programStudi: submissionData.programStudi,
            institusi: submissionData.institusi,
            documents: submissionData.documents || [],
            status: submissionData.status || 'under_review',
            version: 1,
            submittedBy: submissionData.submittedBy || submissionData.submittedByName || 'unknown',
            submittedByMsp: submissionData.submittedByOrg || mspId,
            updatedBy: submissionData.submittedBy || submissionData.submittedByName || 'unknown',
            updatedByMsp: submissionData.submittedByOrg || mspId,
            createdAt: timestamp,
            updatedAt: timestamp,
            docType: 'submission',
            // Include AI recommendation and scoring if present
            ai: submissionData.ai || undefined,
            scoringResult: submissionData.scoringResult || undefined,
            programType: submissionData.programType || undefined
        };

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        console.info(`Submission stored with AI: ${!!submission.ai}, Scoring: ${!!(submission.ai?.scoring)}`);

        // Emit event
        const event: SubmissionCreatedEvent = {
            submissionId,
            programStudi: submission.programStudi,
            institusi: submission.institusi,
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
        console.info(`Attaching AI to submission: ${submissionId}`);
        console.info(`AI payload JSON length: ${aiPayloadJson.length}`);

        // UPPS and Sekretariat can attach AI/analysis
        const mspId = this.assertMSP(ctx, ['UPPSMSP', 'SekadminMSP'], 'AttachAIRecommendation');

        const submission = await this.getSubmission(ctx, submissionId);

        // Parse AI payload JSON directly (no base64 encoding)
        const aiPayload: any = JSON.parse(aiPayloadJson);  // Use any to allow scoring_summary        // Use transaction timestamp for deterministic execution
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.ai = {
            hasLED: aiPayload.hasLED !== undefined ? aiPayload.hasLED : false,
            hasLKPS: aiPayload.hasLKPS !== undefined ? aiPayload.hasLKPS : false,
            readyForScoring: aiPayload.readyForScoring || false,
            notes: aiPayload.notes || '',
            scoreCompleteness: aiPayload.scoreCompleteness || 0,
            flags: aiPayload.flags || [],
            recommendations: aiPayload.recommendations || [],
            scoring: aiPayload.scoring || aiPayload.scoring_summary,  // Support both scoring and scoring_summary
            scoring_summary: aiPayload.scoring_summary,  // Also store scoring_summary explicitly
            analyzedAt: aiPayload.analyzedAt || timestamp
        };
        submission.updatedBy = aiPayload.updatedBy || aiPayload.actor || submission.updatedBy || 'unknown';
        submission.updatedByMsp = aiPayload.updatedByMsp || mspId;
        submission.updatedAt = timestamp;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        // Emit event
        const event: AIRecommendationAttachedEvent = {
            submissionId,
            score: submission.ai?.scoreCompleteness || 0,
            at: submission.updatedAt
        };
        ctx.stub.setEvent('AIRecommendationAttached', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Attach AI Recommendation ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3A: KEA offers a pair of assessors to UPPS
     * Both assessors and UPPS must approve
     */
    @Transaction()
    @Returns('string')
    public async OfferAssessorPair(
        ctx: Context,
        submissionId: string,
        assessor1Id: string,
        assessor1Name: string,
        assessor2Id: string,
        assessor2Name: string,
        offeredBy: string
    ): Promise<string> {
        console.info('============= START : Offer Assessor Pair ===========');

        // Only KEA can offer assessor pairs
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekadminMSP'], 'OfferAssessorPair');

        const submission = await this.getSubmission(ctx, submissionId);

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const offerId = `OFFER-${submissionId}-${txTimestamp.seconds.low}`;

        const offer: AssessorOffer = {
            offerId,
            assessor1Id,
            assessor1Name,
            assessor2Id,
            assessor2Name,
            offeredAt: timestamp,
            offeredBy,
            assessor1Response: 'pending',
            assessor2Response: 'pending',
            uppsResponse: 'pending',
            status: 'pending'
        };

        // Store offer history
        if (!submission.offerHistory) {
            submission.offerHistory = [];
        }
        if (submission.currentOffer) {
            submission.offerHistory.push(submission.currentOffer);
        }

        submission.currentOffer = offer;
        submission.updatedAt = timestamp;
        submission.updatedBy = offeredBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: AssessorOfferEvent = {
            submissionId,
            offerId,
            assessor1Id,
            assessor2Id,
            at: timestamp
        };
        ctx.stub.setEvent('AssessorOfferCreated', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Offer Assessor Pair ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3A: Assessor responds to offer (accept/reject)
     */
    @Transaction()
    @Returns('string')
    public async RespondToOffer(
        ctx: Context,
        submissionId: string,
        assessorId: string,
        response: string,
        notes: string
    ): Promise<string> {
        console.info('============= START : Respond To Offer ===========');

        // Only Asesor can respond
        const mspId = this.assertMSP(ctx, ['AsesorMSP'], 'RespondToOffer');

        if (response !== 'accepted' && response !== 'rejected') {
            throw new Error(`Invalid response: ${response}. Must be 'accepted' or 'rejected'`);
        }

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.currentOffer) {
            throw new Error(`No current offer for submission ${submissionId}`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // Update assessor response
        if (submission.currentOffer.assessor1Id === assessorId) {
            submission.currentOffer.assessor1Response = response as 'accepted' | 'rejected';
            submission.currentOffer.assessor1ResponseAt = timestamp;
            submission.currentOffer.assessor1Notes = notes;
        } else if (submission.currentOffer.assessor2Id === assessorId) {
            submission.currentOffer.assessor2Response = response as 'accepted' | 'rejected';
            submission.currentOffer.assessor2ResponseAt = timestamp;
            submission.currentOffer.assessor2Notes = notes;
        } else {
            throw new Error(`Assessor ${assessorId} is not part of the current offer`);
        }

        // If either assessor rejects, mark offer as rejected
        if (submission.currentOffer.assessor1Response === 'rejected' ||
            submission.currentOffer.assessor2Response === 'rejected') {
            submission.currentOffer.status = 'rejected';
            submission.currentOffer.rejectionReason = `Assessor ${assessorId} rejected`;
        }

        submission.updatedAt = timestamp;
        submission.updatedBy = assessorId;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: AssessorResponseEvent = {
            submissionId,
            offerId: submission.currentOffer.offerId,
            assessorId,
            response: response as 'accepted' | 'rejected',
            at: timestamp
        };
        ctx.stub.setEvent('AssessorResponded', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Respond To Offer ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3A: UPPS responds to assessor pair offer (accept/reject)
     */
    @Transaction()
    @Returns('string')
    public async UPPSRespondToOffer(
        ctx: Context,
        submissionId: string,
        response: string,
        notes: string,
        respondedBy: string
    ): Promise<string> {
        console.info('============= START : UPPS Respond To Offer ===========');

        // Only UPPS can respond
        const mspId = this.assertMSP(ctx, ['UPPSMSP'], 'UPPSRespondToOffer');

        if (response !== 'accepted' && response !== 'rejected') {
            throw new Error(`Invalid response: ${response}. Must be 'accepted' or 'rejected'`);
        }

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.currentOffer) {
            throw new Error(`No current offer for submission ${submissionId}`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.currentOffer.uppsResponse = response as 'accepted' | 'rejected';
        submission.currentOffer.uppsResponseAt = timestamp;
        submission.currentOffer.uppsNotes = notes;

        // If UPPS rejects, mark offer as rejected
        if (response === 'rejected') {
            submission.currentOffer.status = 'rejected';
            submission.currentOffer.rejectionReason = `UPPS rejected: ${notes}`;
        }

        // If all parties accept, finalize assignment
        if (submission.currentOffer.assessor1Response === 'accepted' &&
            submission.currentOffer.assessor2Response === 'accepted' &&
            submission.currentOffer.uppsResponse === 'accepted') {

            submission.currentOffer.status = 'completed';
            submission.assignedAssessors = {
                assessor1Id: submission.currentOffer.assessor1Id,
                assessor1Name: submission.currentOffer.assessor1Name,
                assessor2Id: submission.currentOffer.assessor2Id,
                assessor2Name: submission.currentOffer.assessor2Name,
                assignedAt: timestamp
            };
        }

        submission.updatedAt = timestamp;
        submission.updatedBy = respondedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: UPPSResponseEvent = {
            submissionId,
            offerId: submission.currentOffer.offerId,
            response: response as 'accepted' | 'rejected',
            at: timestamp
        };
        ctx.stub.setEvent('UPPSResponded', Buffer.from(JSON.stringify(event)));

        console.info('============= END : UPPS Respond To Offer ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3A: Assessor submits AK (Asesmen Kecukupan) assessment
     */
    @Transaction()
    @Returns('string')
    public async SubmitAKAssessment(
        ctx: Context,
        submissionId: string,
        assessorId: string,
        assessorName: string,
        scoresJson: string,
        notes: string
    ): Promise<string> {
        console.info('============= START : Submit AK Assessment ===========');

        // Only Asesor can submit AK
        const mspId = this.assertMSP(ctx, ['AsesorMSP'], 'SubmitAKAssessment');

        const submission = await this.getSubmission(ctx, submissionId);

        // Verify assessor is assigned
        if (!submission.assignedAssessors ||
            (submission.assignedAssessors.assessor1Id !== assessorId &&
                submission.assignedAssessors.assessor2Id !== assessorId)) {
            throw new Error(`Assessor ${assessorId} is not assigned to this submission`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const scores = JSON.parse(scoresJson);
        const totalScore = Object.values(scores).reduce((sum: number, val: any) => sum + Number(val), 0);

        const assessment: AKAssessment = {
            assessorId,
            assessorName,
            scores,
            totalScore,
            notes,
            submittedAt: timestamp
        };

        if (!submission.akAssessments) {
            submission.akAssessments = [];
        }

        // Replace if assessor already submitted
        const existingIndex = submission.akAssessments.findIndex(a => a.assessorId === assessorId);
        if (existingIndex >= 0) {
            submission.akAssessments[existingIndex] = assessment;
        } else {
            submission.akAssessments.push(assessment);
        }

        submission.updatedAt = timestamp;
        submission.updatedBy = assessorName;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: AKAssessmentSubmittedEvent = {
            submissionId,
            assessorId,
            at: timestamp
        };
        ctx.stub.setEvent('AKAssessmentSubmitted', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Submit AK Assessment ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3A: KEA checks consistency of AK scores between assessors
     */
    @Transaction()
    @Returns('string')
    public async CheckAKConsistency(
        ctx: Context,
        submissionId: string,
        consistent: boolean,
        checkedBy: string,
        notes: string
    ): Promise<string> {
        console.info('============= START : Check AK Consistency ===========');

        // Only KEA can check consistency
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekadminMSP'], 'CheckAKConsistency');

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.akAssessments || submission.akAssessments.length < 2) {
            throw new Error(`Need at least 2 AK assessments to check consistency`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.akConsistent = consistent;
        submission.akConsistencyCheckedAt = timestamp;
        submission.akConsistencyCheckedBy = checkedBy;
        submission.updatedAt = timestamp;
        submission.updatedBy = checkedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: AKConsistencyCheckedEvent = {
            submissionId,
            consistent,
            at: timestamp
        };
        ctx.stub.setEvent('AKConsistencyChecked', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Check AK Consistency ===========');
        return JSON.stringify(submission);
    }

    /**
     * Assign assessor to a submission (Sekretariat only) - DEPRECATED
     * Use OfferAssessorPair instead
     */
    @Transaction()
    @Returns('string')
    public async AssignAssessor(
        ctx: Context,
        submissionId: string,
        assessorId: string,
        assignedBy: string,
        notes: string
    ): Promise<string> {
        const mspId = this.assertMSP(ctx, ['SekadminMSP', 'KEAMSP'], 'AssignAssessor');
        const submission = await this.getSubmission(ctx, submissionId);

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.assignedAssessorId = assessorId;
        submission.assignedBy = assignedBy || 'sekretariat';
        submission.assignedAt = timestamp;
        submission.assignmentNotes = notes || '';
        submission.updatedAt = timestamp;
        submission.updatedBy = assignedBy || 'sekretariat';
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: SubmissionAssignedEvent = {
            submissionId,
            assessorId,
            assignedBy: submission.assignedBy,
            at: timestamp
        };
        ctx.stub.setEvent('SubmissionAssigned', Buffer.from(JSON.stringify(event)));

        return JSON.stringify(submission);
    }

    /**
     * Clear assessor assignment (Sekretariat only) - DEPRECATED
     */
    @Transaction()
    @Returns('string')
    public async ClearAssessor(
        ctx: Context,
        submissionId: string
    ): Promise<string> {
        const mspId = this.assertMSP(ctx, ['SekadminMSP', 'KEAMSP'], 'ClearAssessor');
        const submission = await this.getSubmission(ctx, submissionId);

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.assignedAssessorId = undefined;
        submission.assignedBy = undefined;
        submission.assignedAt = undefined;
        submission.assignmentNotes = undefined;
        submission.updatedAt = timestamp;
        submission.updatedBy = 'sekretariat';
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));
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

        // Only Sekretariat (or Assessor for peer review) can set decisions
        const mspId = this.assertMSP(ctx, ['SekadminMSP', 'AsesorMSP', 'KEAMSP', 'MajelisMSP'], 'SetDecision');

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
            decidedByMsp: mspId,
            decidedAt: timestamp
        };
        submission.updatedBy = decidedBy || 'unknown';
        submission.updatedByMsp = mspId;
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

        // UPPS and Sekretariat can update documents (revision cycle)
        const mspId = this.assertMSP(ctx, ['UPPSMSP', 'SekadminMSP'], 'UpdateDocuments');

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
        submission.updatedBy = submission.updatedBy || 'unknown';
        submission.updatedByMsp = mspId;

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
     * Store scoring result (Assessor / Sekretariat)
     * @param ctx - Transaction context
     * @param submissionId - Submission identifier
     * @param scoringJson - JSON string of scoring result
     */
    @Transaction()
    @Returns('string')
    public async SetScoringResult(
        ctx: Context,
        submissionId: string,
        scoringJson: string
    ): Promise<string> {
        console.info('============= START : Set Scoring Result ===========');

        const mspId = this.assertMSP(ctx, ['AsesorMSP', 'SekadminMSP', 'KEAMSP'], 'SetScoringResult');
        const submission = await this.getSubmission(ctx, submissionId);

        const scoringResult = JSON.parse(scoringJson);

        // Use transaction timestamp for deterministic execution
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.scoringResult = scoringResult;
        submission.status = submission.status || 'under_review';
        submission.updatedAt = timestamp;
        submission.updatedBy = scoringResult.calculatedBy || 'assessor';
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: ScoringUpdatedEvent = {
            submissionId,
            at: timestamp,
            scoredBy: submission.updatedBy,
            scoredByMsp: mspId
        };
        ctx.stub.setEvent('ScoringUpdated', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Set Scoring Result ===========');
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
