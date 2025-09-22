declare class AttachedDocument {
    docId: string;
    docHash: string;
    uploadedTimestamp: Date;
}
export declare class Submission {
    submissionID: string;
    programID: string;
    universityID: string;
    status: string;
    creationDate: Date;
    lastUpdate: Date;
    documents: AttachedDocument[];
}
export {};
