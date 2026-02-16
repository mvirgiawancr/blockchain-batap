import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    Submission,
    Document,
    AIRecommendation,
    Decision,
    AssessorOffer,
    AKAssessment,
    ALSchedule,
    FlowSyncStatus,
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
    AKConsistencyCheckedEvent,
    KEARejectionReviewedEvent,
    ALScheduleProposedEvent,
    ALScheduleApprovedEvent,
    FlowsSynchronizedEvent,
    ALExecution,
    ALResponse,
    VerificationResult,
    AccreditationDecision,
    ALExecutionSubmittedEvent,
    ALResponseSubmittedEvent,
    VerificationCompletedEvent,
    AccreditationFinalizedEvent
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
        const mspId = this.assertMSP(ctx, ['UPPSMSP', 'SekretariatMSP'], 'CreateSubmission');

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
        const mspId = this.assertMSP(ctx, ['UPPSMSP', 'SekretariatMSP'], 'AttachAIRecommendation');

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
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekretariatMSP'], 'OfferAssessorPair');

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

        // If all parties have accepted, finalize assignment
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
            console.info(`Assignment finalized for submission ${submissionId}`);
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
     * If rejected, reason is required and KEA must review
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

        // Rejection requires a reason
        if (response === 'rejected' && (!notes || notes.trim() === '')) {
            throw new Error('Rejection reason is required. Please provide a reason for rejecting the assessor assignment.');
        }

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.currentOffer) {
            throw new Error(`No current offer for submission ${submissionId}`);
        }

        // Validate that both assessors have already accepted before UPPS can respond
        if (submission.currentOffer.assessor1Response !== 'accepted') {
            throw new Error('Cannot respond yet. Assessor 1 has not accepted the assignment.');
        }
        if (submission.currentOffer.assessor2Response !== 'accepted') {
            throw new Error('Cannot respond yet. Assessor 2 has not accepted the assignment.');
        }

        // Check if UPPS already responded (only block if already accepted/rejected, not pending)
        if (submission.currentOffer.uppsResponse &&
            submission.currentOffer.uppsResponse !== 'pending' &&
            (submission.currentOffer.uppsResponse === 'accepted' || submission.currentOffer.uppsResponse === 'rejected')) {
            throw new Error(`UPPS has already responded with: ${submission.currentOffer.uppsResponse}`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.currentOffer.uppsResponse = response as 'accepted' | 'rejected';
        submission.currentOffer.uppsResponseAt = timestamp;
        submission.currentOffer.uppsNotes = notes;

        // If UPPS rejects, mark offer as pending KEA review (not rejected yet)
        if (response === 'rejected') {
            submission.currentOffer.status = 'pending_kea_review';
            submission.currentOffer.rejectionReason = notes;
            submission.currentOffer.keaReviewStatus = 'pending';
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
     * PHASE 3A: KEA reviews UPPS rejection reason
     * If reason_accepted: KEA can assign new assessors
     * If reason_rejected: Force assign the current assessors despite UPPS objection
     */
    @Transaction()
    @Returns('string')
    public async KEAReviewRejection(
        ctx: Context,
        submissionId: string,
        decision: string,
        notes: string,
        reviewedBy: string
    ): Promise<string> {
        console.info('============= START : KEA Review Rejection ===========');

        // Only KEA can review rejections
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekretariatMSP'], 'KEAReviewRejection');

        if (decision !== 'reason_accepted' && decision !== 'reason_rejected') {
            throw new Error(`Invalid decision: ${decision}. Must be 'reason_accepted' or 'reason_rejected'`);
        }

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.currentOffer) {
            throw new Error(`No current offer for submission ${submissionId}`);
        }

        if (submission.currentOffer.status !== 'pending_kea_review') {
            throw new Error(`Offer is not pending KEA review. Current status: ${submission.currentOffer.status}`);
        }

        if (submission.currentOffer.keaReviewStatus !== 'pending') {
            throw new Error(`KEA review already completed with status: ${submission.currentOffer.keaReviewStatus}`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.currentOffer.keaReviewStatus = decision as 'reason_accepted' | 'reason_rejected';
        submission.currentOffer.keaReviewedAt = timestamp;
        submission.currentOffer.keaReviewedBy = reviewedBy;
        submission.currentOffer.keaReviewNotes = notes;

        if (decision === 'reason_accepted') {
            // KEA accepts UPPS rejection reason - mark offer as rejected so KEA can assign new assessors
            submission.currentOffer.status = 'rejected';
            console.info(`KEA accepted UPPS rejection reason. New assessors can be assigned.`);
        } else {
            // KEA rejects UPPS reason - force assign the assessors despite UPPS objection
            submission.currentOffer.status = 'force_assigned';
            submission.assignedAssessors = {
                assessor1Id: submission.currentOffer.assessor1Id,
                assessor1Name: submission.currentOffer.assessor1Name,
                assessor2Id: submission.currentOffer.assessor2Id,
                assessor2Name: submission.currentOffer.assessor2Name,
                assignedAt: timestamp
            };
            console.info(`KEA rejected UPPS reason. Assessors force-assigned to submission ${submissionId}`);
        }

        submission.updatedAt = timestamp;
        submission.updatedBy = reviewedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: KEARejectionReviewedEvent = {
            submissionId,
            offerId: submission.currentOffer.offerId,
            decision: decision as 'reason_accepted' | 'reason_rejected',
            reviewedBy,
            at: timestamp
        };
        ctx.stub.setEvent('KEARejectionReviewed', Buffer.from(JSON.stringify(event)));

        console.info('============= END : KEA Review Rejection ===========');
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
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekretariatMSP'], 'CheckAKConsistency');

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
        const mspId = this.assertMSP(ctx, ['SekretariatMSP', 'KEAMSP'], 'AssignAssessor');
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
        const mspId = this.assertMSP(ctx, ['SekretariatMSP', 'KEAMSP'], 'ClearAssessor');
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
        const mspId = this.assertMSP(ctx, ['SekretariatMSP', 'SekretariatAdminMSP', 'AsesorMSP', 'KEAMSP', 'MajelisMSP'], 'SetDecision');

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
        const mspId = this.assertMSP(ctx, ['UPPSMSP', 'SekretariatMSP'], 'UpdateDocuments');

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

        const mspId = this.assertMSP(ctx, ['AsesorMSP', 'SekretariatMSP', 'KEAMSP'], 'SetScoringResult');
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

    // =====================================================
    // PHASE 3B: AL (Asesmen Lapangan) Scheduling Functions
    // =====================================================

    /**
     * PHASE 3B STEP 18: KEA proposes AL schedule date and venue
     */
    @Transaction()
    @Returns('string')
    public async ProposeALSchedule(
        ctx: Context,
        submissionId: string,
        proposedDate: string,
        proposedEndDate: string,
        proposedVenue: string,
        proposedBy: string
    ): Promise<string> {
        console.info('============= START : Propose AL Schedule ===========');

        // Only KEA can propose AL schedule
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekretariatMSP'], 'ProposeALSchedule');

        const submission = await this.getSubmission(ctx, submissionId);

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const scheduleId = `SCHED-${submissionId}-${txTimestamp.seconds.low}`;

        const schedule: ALSchedule = {
            scheduleId,
            proposedDate,
            proposedEndDate: proposedEndDate || undefined,
            proposedVenue,
            proposedBy,
            proposedAt: timestamp,
            status: 'proposed'
        };

        // Store schedule history
        if (!submission.alScheduleHistory) {
            submission.alScheduleHistory = [];
        }
        if (submission.alSchedule) {
            submission.alScheduleHistory.push(submission.alSchedule);
        }

        submission.alSchedule = schedule;
        submission.updatedAt = timestamp;
        submission.updatedBy = proposedBy;
        submission.updatedByMsp = mspId;

        // Initialize flow sync status if not exists
        if (!submission.flowSyncStatus) {
            submission.flowSyncStatus = {
                flowACompleted: false,
                flowBCompleted: false,
                syncCompleted: false,
                readyForAL: false
            };
        }

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: ALScheduleProposedEvent = {
            submissionId,
            scheduleId,
            proposedDate,
            proposedBy,
            at: timestamp
        };
        ctx.stub.setEvent('ALScheduleProposed', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Propose AL Schedule ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3B STEP 19-20: Sekretariat Admin verifies and approves AL schedule
     */
    @Transaction()
    @Returns('string')
    public async ApproveALSchedule(
        ctx: Context,
        submissionId: string,
        approved: boolean,
        notes: string,
        approvedBy: string
    ): Promise<string> {
        console.info('============= START : Approve AL Schedule ===========');

        // Only Sekretariat Admin can approve AL schedule
        const mspId = this.assertMSP(ctx, ['SekretariatMSP', 'SekretariatMSP'], 'ApproveALSchedule');

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.alSchedule) {
            throw new Error(`No AL schedule proposed for submission ${submissionId}`);
        }

        if (submission.alSchedule.status !== 'proposed') {
            throw new Error(`AL schedule is already ${submission.alSchedule.status}`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        submission.alSchedule.status = approved ? 'approved' : 'rejected';
        submission.alSchedule.approvedBy = approvedBy;
        submission.alSchedule.approvedAt = timestamp;
        submission.alSchedule.approvalNotes = notes;

        if (!approved) {
            submission.alSchedule.rejectionReason = notes;
        }

        // Update flow sync status for Flow B
        if (approved) {
            if (!submission.flowSyncStatus) {
                submission.flowSyncStatus = {
                    flowACompleted: false,
                    flowBCompleted: false,
                    syncCompleted: false,
                    readyForAL: false
                };
            }
            submission.flowSyncStatus.flowBCompleted = true;
            submission.flowSyncStatus.flowBCompletedAt = timestamp;

            // Check if both flows are completed
            if (submission.flowSyncStatus.flowACompleted && submission.flowSyncStatus.flowBCompleted) {
                submission.flowSyncStatus.syncCompleted = true;
                submission.flowSyncStatus.syncCompletedAt = timestamp;
                submission.flowSyncStatus.readyForAL = true;

                // Emit sync event
                const syncEvent: FlowsSynchronizedEvent = {
                    submissionId,
                    flowACompletedAt: submission.flowSyncStatus.flowACompletedAt || timestamp,
                    flowBCompletedAt: timestamp,
                    syncCompletedAt: timestamp
                };
                ctx.stub.setEvent('FlowsSynchronized', Buffer.from(JSON.stringify(syncEvent)));
            }
        }

        submission.updatedAt = timestamp;
        submission.updatedBy = approvedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: ALScheduleApprovedEvent = {
            submissionId,
            scheduleId: submission.alSchedule.scheduleId,
            approved,
            approvedBy,
            at: timestamp
        };
        ctx.stub.setEvent('ALScheduleApproved', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Approve AL Schedule ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 3B STEP 21: Check if both flows (A and B) are synchronized
     * Called when AK consistency is confirmed (Flow A complete) or AL is approved (Flow B complete)
     */
    @Transaction()
    @Returns('string')
    public async CheckFlowsSynchronized(
        ctx: Context,
        submissionId: string,
        checkedBy: string
    ): Promise<string> {
        console.info('============= START : Check Flows Synchronized ===========');

        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekretariatMSP'], 'CheckFlowsSynchronized');

        const submission = await this.getSubmission(ctx, submissionId);

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // Initialize flow sync status if not exists
        if (!submission.flowSyncStatus) {
            submission.flowSyncStatus = {
                flowACompleted: false,
                flowBCompleted: false,
                syncCompleted: false,
                readyForAL: false
            };
        }

        // Check Flow A: AK consistent
        if (submission.akConsistent === true && !submission.flowSyncStatus.flowACompleted) {
            submission.flowSyncStatus.flowACompleted = true;
            submission.flowSyncStatus.flowACompletedAt = submission.akConsistencyCheckedAt || timestamp;
        }

        // Check Flow B: AL schedule approved
        if (submission.alSchedule?.status === 'approved' && !submission.flowSyncStatus.flowBCompleted) {
            submission.flowSyncStatus.flowBCompleted = true;
            submission.flowSyncStatus.flowBCompletedAt = submission.alSchedule.approvedAt || timestamp;
        }

        // Check if both flows are completed (Parallel Gateway Join)
        if (submission.flowSyncStatus.flowACompleted && submission.flowSyncStatus.flowBCompleted) {
            if (!submission.flowSyncStatus.syncCompleted) {
                submission.flowSyncStatus.syncCompleted = true;
                submission.flowSyncStatus.syncCompletedAt = timestamp;
                submission.flowSyncStatus.readyForAL = true;

                // Emit sync event
                const syncEvent: FlowsSynchronizedEvent = {
                    submissionId,
                    flowACompletedAt: submission.flowSyncStatus.flowACompletedAt || timestamp,
                    flowBCompletedAt: submission.flowSyncStatus.flowBCompletedAt || timestamp,
                    syncCompletedAt: timestamp
                };
                ctx.stub.setEvent('FlowsSynchronized', Buffer.from(JSON.stringify(syncEvent)));
            }
        }

        submission.updatedAt = timestamp;
        submission.updatedBy = checkedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        console.info('============= END : Check Flows Synchronized ===========');
        return JSON.stringify(submission);
    }

    /**
     * Query submissions ready for AL (both flows completed)
     */
    @Transaction(false)
    @Returns('string')
    public async QuerySubmissionsReadyForAL(ctx: Context): Promise<string> {
        const queryString = JSON.stringify({
            selector: {
                docType: 'submission',
                'flowSyncStatus.readyForAL': true
            }
        });
        return await this.getQueryResultForQueryString(ctx, queryString);
    }

    /**
     * Query submissions with pending AL schedule
     */
    @Transaction(false)
    @Returns('string')
    public async QueryPendingALSchedules(ctx: Context): Promise<string> {
        const queryString = JSON.stringify({
            selector: {
                docType: 'submission',
                'alSchedule.status': 'proposed'
            }
        });
        return await this.getQueryResultForQueryString(ctx, queryString);
    }

    /**
     * PHASE 4: Assessor submits AL Execution (Berita Acara)
     */
    @Transaction()
    @Returns('string')
    public async SubmitALExecution(
        ctx: Context,
        submissionId: string,
        executionJson: string
    ): Promise<string> {
        console.info('============= START : Submit AL Execution ===========');
        const mspId = this.assertMSP(ctx, ['AsesorMSP'], 'SubmitALExecution');

        const submission = await this.getSubmission(ctx, submissionId);

        // Validation: Must be ready for AL
        if (!submission.flowSyncStatus?.readyForAL) {
            throw new Error('Submission is not ready for AL Execution');
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const executionData = JSON.parse(executionJson);
        const alExecution: ALExecution = {
            executionId: `AL-EXEC-${submissionId}-${txTimestamp.seconds.low}`,
            submissionId,
            beritaAcaraCid: executionData.beritaAcaraCid,
            beritaAcaraHash: executionData.beritaAcaraHash,
            attendanceValues: executionData.attendanceValues,
            findings: executionData.findings || [],
            scores: executionData.scores || {},
            totalScore: executionData.totalScore || 0,
            submittedBy: executionData.submittedBy,
            submittedAt: timestamp
        };

        submission.alExecution = alExecution;
        submission.status = 'al_conducted'; // Update status
        submission.updatedAt = timestamp;
        submission.updatedBy = executionData.submittedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: ALExecutionSubmittedEvent = {
            submissionId,
            executionId: alExecution.executionId,
            submittedBy: alExecution.submittedBy,
            at: timestamp
        };
        ctx.stub.setEvent('ALExecutionSubmitted', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Submit AL Execution ===========');
        return JSON.stringify(submission);
    }

    /**
     * PHASE 4: UPPS Responds to AL Findings
     */
    @Transaction()
    @Returns('string')
    public async SubmitUPPSResponse(
        ctx: Context,
        submissionId: string,
        responseJson: string
    ): Promise<string> {
        console.info('============= START : Submit UPPS Response ===========');
        const mspId = this.assertMSP(ctx, ['UPPSMSP'], 'SubmitUPPSResponse');

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.alExecution) {
            throw new Error('AL Execution not found. Cannot respond.');
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const responseData = JSON.parse(responseJson);
        const alResponse: ALResponse = {
            responseId: `AL-RESP-${submissionId}-${txTimestamp.seconds.low}`,
            submissionId,
            executionId: submission.alExecution.executionId,
            responseHash: responseData.responseHash,
            responseCid: responseData.responseCid,
            notes: responseData.notes,
            respondedBy: responseData.respondedBy,
            respondedAt: timestamp,
            status: 'submitted'
        };

        submission.alResponse = alResponse;
        submission.status = 'al_responded';
        submission.updatedAt = timestamp;
        submission.updatedBy = responseData.respondedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: ALResponseSubmittedEvent = {
            submissionId,
            responseId: alResponse.responseId,
            respondedBy: alResponse.respondedBy,
            at: timestamp
        };
        ctx.stub.setEvent('ALResponseSubmitted', Buffer.from(JSON.stringify(event)));

        return JSON.stringify(submission);
    }

    /**
     * PHASE 5: KEA Verifies AL Results & Finalizes Score
     */
    @Transaction()
    @Returns('string')
    public async VerifyALResult(
        ctx: Context,
        submissionId: string,
        verificationJson: string
    ): Promise<string> {
        console.info('============= START : Verify AL Result ===========');
        const mspId = this.assertMSP(ctx, ['KEAMSP', 'SekretariatMSP'], 'VerifyALResult');

        const submission = await this.getSubmission(ctx, submissionId);

        // Must have AL Execution and Response (optional?) probably yes
        if (!submission.alExecution) {
            throw new Error('AL Execution data missing');
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const verificationData = JSON.parse(verificationJson);
        const verificationResult: VerificationResult = {
            verificationId: `VERIFY-${submissionId}-${txTimestamp.seconds.low}`,
            submissionId,
            verifiedBy: verificationData.verifiedBy,
            verifiedAt: timestamp,
            notes: verificationData.notes,
            scoreAdjustments: verificationData.scoreAdjustments || [],
            finalScore: verificationData.finalScore,
            recommendedRank: verificationData.recommendedRank
        };

        submission.verificationResult = verificationResult;
        submission.status = 'verified';
        submission.updatedAt = timestamp;
        submission.updatedBy = verificationData.verifiedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: VerificationCompletedEvent = {
            submissionId,
            verificationId: verificationResult.verificationId,
            verifiedBy: verificationResult.verifiedBy,
            finalScore: verificationResult.finalScore,
            at: timestamp
        };
        ctx.stub.setEvent('VerificationCompleted', Buffer.from(JSON.stringify(event)));

        return JSON.stringify(submission);
    }

    /**
     * PHASE 5: Majelis Accredtiation Decision
     */
    @Transaction()
    @Returns('string')
    public async FinalizeAccreditation(
        ctx: Context,
        submissionId: string,
        decisionJson: string
    ): Promise<string> {
        console.info('============= START : Finalize Accreditation ===========');
        const mspId = this.assertMSP(ctx, ['MajelisMSP', 'SekretariatMSP', 'KEAMSP'], 'FinalizeAccreditation'); // Allowed MSPs

        const submission = await this.getSubmission(ctx, submissionId);

        if (!submission.verificationResult) {
            throw new Error('Verification result missing. Cannot finalize.');
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const decisionData = JSON.parse(decisionJson);
        const decision: AccreditationDecision = {
            decisionId: `DECISION-${submissionId}-${txTimestamp.seconds.low}`,
            submissionId,
            finalRank: decisionData.finalRank,
            finalScore: decisionData.finalScore,
            skNumber: decisionData.skNumber,
            skDate: decisionData.skDate,
            validUntil: decisionData.validUntil,
            decidedBy: decisionData.decidedBy,
            decidedAt: timestamp,
            certificateCid: decisionData.certificateCid
        };

        submission.accreditationDecision = decision;
        submission.status = 'accredited';
        submission.updatedAt = timestamp;
        submission.updatedBy = decisionData.decidedBy;
        submission.updatedByMsp = mspId;

        await ctx.stub.putState(submissionId, Buffer.from(JSON.stringify(submission)));

        const event: AccreditationFinalizedEvent = {
            submissionId,
            decisionId: decision.decisionId,
            finalRank: decision.finalRank,
            skNumber: decision.skNumber,
            at: timestamp
        };
        ctx.stub.setEvent('AccreditationFinalized', Buffer.from(JSON.stringify(event)));

        console.info('============= END : Finalize Accreditation ===========');
        return JSON.stringify(submission);
    }
}
