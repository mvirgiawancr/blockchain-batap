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
    decidedAt: string;
}

export interface Submission {
    submissionId: string;
    programStudi: string;
    institusi: string;
    programType?: string;  // S, M, D, D1, D2, D3, STr, MTr, DTr, PPI
    documents: Document[];
    status: 'under_review' | 'approved' | 'rejected';
    version: number;
    ai?: AIRecommendation;
    decision?: Decision;
    previousDecisions?: Decision[];
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
