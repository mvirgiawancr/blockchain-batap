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
    status: 'pending' | 'completed' | 'rejected' | 'pending_kea_review' | 'force_assigned';
    rejectionReason?: string;
    // KEA review fields for UPPS rejection
    keaReviewStatus?: 'pending' | 'reason_accepted' | 'reason_rejected';
    keaReviewedAt?: string;
    keaReviewedBy?: string;
    keaReviewNotes?: string;
}

export interface AKAssessment {
    assessorId: string;
    assessorName: string;
    scores: { [key: string]: number };
    totalScore: number;
    notes: string;
    submittedAt: string;
}


// Phase 4: AL Execution & Response
export interface ALExecution {
    executionId: string;
    submissionId: string;
    beritaAcaraCid: string; // IPFS CID for Berita Acara PDF
    beritaAcaraHash: string;
    attendanceValues: {
        asesor1: boolean;
        asesor2: boolean;
        uppsRepresentative: boolean;
    };
    findings: string[]; // List of major findings
    scores: { [key: string]: number }; // Final AL scores per criteria
    totalScore: number;
    submittedBy: string;
    submittedAt: string;
}

export interface ALResponse {
    responseId: string;
    submissionId: string;
    executionId: string;
    responseHash: string; // Hash of the response document/text
    responseCid?: string; // Optional PDF
    notes: string;
    respondedBy: string;
    respondedAt: string;
    status: 'submitted' | 'accepted' | 'rejected'; // KEA/Assessor might review this
}

// Phase 5: Verification & Decision
export interface VerificationResult {
    verificationId: string;
    submissionId: string;
    verifiedBy: string;
    verifiedAt: string;
    notes: string;
    scoreAdjustments?: {
        criteria: string;
        originalScore: number;
        adjustedScore: number;
        reason: string;
    }[];
    finalScore: number;
    recommendedRank: 'Unggul' | 'Baik Sekali' | 'Baik' | 'Tidak Terakreditasi';
}

export interface AccreditationDecision {
    decisionId: string;
    submissionId: string;
    finalRank: 'Unggul' | 'Baik Sekali' | 'Baik' | 'Tidak Terakreditasi';
    finalScore: number;
    skNumber: string; // Nomor SK
    skDate: string;
    validUntil: string;
    decidedBy: string; // Majelis Chair
    decidedAt: string;
    certificateCid?: string; // Phase 6: Certificate
}

export interface Submission {
    submissionId: string;
    programStudi: string;
    institusi: string;
    programType?: string;  // S, M, D, D1, D2, D3, STr, MTr, DTr, PPI
    documents: Document[];
    status: 'draft' | 'uploaded' | 'processing' | 'under_review' | 'approved' | 'rejected' |
    'al_scheduled' | 'al_conducted' | 'al_responded' | 'verified' | 'accredited';
    version: number;
    ai?: AIRecommendation;
    decision?: Decision; // Deprecated or used for intermediate decisions
    previousDecisions?: Decision[];
    scoringResult?: any;
    submittedBy?: string;
    submittedByMsp?: string;
    invokedByX509?: string; // X.509 subject DN of the identity that created this submission
    updatedBy?: string;
    updatedByMsp?: string;
    updatedByX509?: string; // X.509 subject DN of the last identity that updated this submission

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

    // Phase 4: AL Execution
    alExecution?: ALExecution;
    alResponse?: ALResponse;

    // Phase 5: Verification & Decision
    verificationResult?: VerificationResult;
    accreditationDecision?: AccreditationDecision;

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

export interface KEARejectionReviewedEvent {
    submissionId: string;
    offerId: string;
    decision: 'reason_accepted' | 'reason_rejected';
    reviewedBy: string;
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

export interface ALExecutionSubmittedEvent {
    submissionId: string;
    executionId: string;
    submittedBy: string;
    at: string;
}

export interface ALResponseSubmittedEvent {
    submissionId: string;
    responseId: string;
    respondedBy: string;
    at: string;
}

export interface VerificationCompletedEvent {
    submissionId: string;
    verificationId: string;
    verifiedBy: string;
    finalScore: number;
    at: string;
}

export interface AccreditationFinalizedEvent {
    submissionId: string;
    decisionId: string;
    finalRank: string;
    skNumber: string;
    at: string;
}
