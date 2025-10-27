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
    scoreCompleteness: number;
    flags: string[];
    recommendations: string[];
    analyzedAt: string;
    scoring?: ScoringResult;
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
