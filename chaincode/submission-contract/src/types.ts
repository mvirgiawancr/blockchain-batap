/**
 * Types for Submission Contract
 */

export interface Document {
    type: string;
    cid: string;
    hash: string;
    filename?: string;
    verified?: boolean;
    confidence?: number;
    size?: number;
    encrypted?: boolean;
}

export interface AIRecommendation {
    hasLED?: boolean;
    hasLKPS?: boolean;
    readyForScoring?: boolean;
    notes?: string;
    scoreCompleteness: number;
    flags: string[];
    recommendations: string[];
    analyzedAt: string;
    scoring?: any;  // Allow any structure for full LAM-TEK scoring
    scoring_summary?: ScoringResult;  // Support for simplified scoring format
}

export interface ScoringResult {
    total_score: number;
    max_possible_score: number;
    overall_percentage: number;
    total_indicators: number;
    results: IndicatorScore[];
}

export interface IndicatorScore {
    indicator_number: string;
    indicator_name: string;
    score: number;
    method: string;
}

export interface Decision {
    result: 'approved' | 'rejected';
    notes: string;
    decidedBy: string;
    decidedByMsp?: string;
    decidedAt: string;
}

export interface AssessorOffer {
    offerId: string;
    assessor1Id: string;
    assessor1Name: string;
    assessor2Id: string;
    assessor2Name: string;
    offeredAt: string;
    offeredBy: string;
    assessor1Response?: 'pending' | 'accepted' | 'rejected';
    assessor1ResponseAt?: string;
    assessor1Notes?: string;
    assessor2Response?: 'pending' | 'accepted' | 'rejected';
    assessor2ResponseAt?: string;
    assessor2Notes?: string;
    uppsResponse?: 'pending' | 'accepted' | 'rejected';
    uppsResponseAt?: string;
    uppsNotes?: string;
    status: 'pending' | 'completed' | 'rejected';
    rejectionReason?: string;
}

export interface AKAssessment {
    assessorId: string;
    assessorName: string;
    scores: { [key: string]: number };
    totalScore: number;
    notes: string;
    submittedAt: string;
}

export interface Submission {
    submissionId: string;
    programStudi: string;
    institusi: string;
    programType?: string;  // S, M, D, D1, D2, D3, STr, MTr, DTr, PPI
    documents: Document[];
    status: 'draft' | 'uploaded' | 'processing' | 'under_review' | 'approved' | 'rejected';
    version: number;
    ai?: AIRecommendation;
    decision?: Decision;
    previousDecisions?: Decision[];
    scoringResult?: any;
    submittedBy?: string;
    submittedByMsp?: string;
    updatedBy?: string;
    updatedByMsp?: string;

    // Phase 3A: Assessor Assignment & AK
    currentOffer?: AssessorOffer;
    offerHistory?: AssessorOffer[];
    assignedAssessors?: {
        assessor1Id: string;
        assessor1Name: string;
        assessor2Id: string;
        assessor2Name: string;
        assignedAt: string;
    };
    akAssessments?: AKAssessment[];
    akConsistent?: boolean;
    akConsistencyCheckedAt?: string;
    akConsistencyCheckedBy?: string;

    // Phase 3B: AL Scheduling
    alSchedule?: ALSchedule;
    alScheduleHistory?: ALSchedule[];
    flowSyncStatus?: FlowSyncStatus;

    // Deprecated fields (kept for backward compatibility)
    assignedAssessorId?: string;
    assignedBy?: string;
    assignedAt?: string;
    assignmentNotes?: string;

    createdAt: string;
    updatedAt: string;
    docType: string;
}

export interface SubmissionCreatedEvent {
    submissionId: string;
    programStudi: string;
    institusi: string;
    at: string;
}

export interface AIRecommendationAttachedEvent {
    submissionId: string;
    score: number;
    at: string;
}

export interface SubmissionDecidedEvent {
    submissionId: string;
    status: 'approved' | 'rejected';
    at: string;
}

export interface SubmissionDocumentsUpdatedEvent {
    submissionId: string;
    version: number;
    at: string;
}

export interface ScoringUpdatedEvent {
    submissionId: string;
    at: string;
    scoredBy?: string;
    scoredByMsp?: string;
}

export interface SubmissionAssignedEvent {
    submissionId: string;
    assessorId: string;
    assignedBy: string;
    at: string;
}

export interface AssessorOfferEvent {
    submissionId: string;
    offerId: string;
    assessor1Id: string;
    assessor2Id: string;
    at: string;
}

export interface AssessorResponseEvent {
    submissionId: string;
    offerId: string;
    assessorId: string;
    response: 'accepted' | 'rejected';
    at: string;
}

export interface UPPSResponseEvent {
    submissionId: string;
    offerId: string;
    response: 'accepted' | 'rejected';
    at: string;
}

export interface AKAssessmentSubmittedEvent {
    submissionId: string;
    assessorId: string;
    at: string;
}

export interface AKConsistencyCheckedEvent {
    submissionId: string;
    consistent: boolean;
    at: string;
}

// Phase 3B: AL (Asesmen Lapangan) Scheduling
export interface ALSchedule {
    scheduleId: string;
    proposedDate: string;
    proposedEndDate?: string;
    proposedVenue: string;
    proposedBy: string;
    proposedAt: string;
    status: 'proposed' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    approvalNotes?: string;
    rejectionReason?: string;
}

// Flow synchronization tracking
export interface FlowSyncStatus {
    flowACompleted: boolean;  // AK Assessment consistent
    flowACompletedAt?: string;
    flowBCompleted: boolean;  // AL Schedule approved
    flowBCompletedAt?: string;
    syncCompleted: boolean;   // Both flows finished
    syncCompletedAt?: string;
    readyForAL: boolean;      // Ready for field assessment
}

// Events for AL Scheduling
export interface ALScheduleProposedEvent {
    submissionId: string;
    scheduleId: string;
    proposedDate: string;
    proposedBy: string;
    at: string;
}

export interface ALScheduleApprovedEvent {
    submissionId: string;
    scheduleId: string;
    approved: boolean;
    approvedBy: string;
    at: string;
}

export interface FlowsSynchronizedEvent {
    submissionId: string;
    flowACompletedAt: string;
    flowBCompletedAt: string;
    syncCompletedAt: string;
}
