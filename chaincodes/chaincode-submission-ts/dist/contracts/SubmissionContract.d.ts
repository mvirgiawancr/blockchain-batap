import { Context, Contract } from 'fabric-contract-api';
export declare class SubmissionContract extends Contract {
    createSubmission(ctx: Context, submissionID: string, programID: string, universityID: string): Promise<void>;
    getSubmission(ctx: Context, submissionID: string): Promise<string>;
    addDocument(ctx: Context, submissionID: string, docId: string, docHash: string): Promise<void>;
    updateStatus(ctx: Context, submissionID: string, newStatus: string): Promise<void>;
    put(ctx: Context, key: string, value: string): Promise<{
        success: string;
    }>;
}
