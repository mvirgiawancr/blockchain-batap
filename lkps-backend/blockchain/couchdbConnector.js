const axios = require('axios');

class CouchDBConnector {
    constructor() {
        // CouchDB configuration - assumes CouchDB is running on peer nodes
        this.couchdbUrl = 'http://localhost:5100'; // Default CouchDB port
        this.databases = {
            submissions: 'my-channel1_chaincode-submission-ts', // Channel + chaincode name
            users: 'my-channel1_chaincode-submission-ts',
            assessments: 'my-channel1_chaincode-submission-ts'
        };
    }

    async testConnection() {
        try {
            const response = await axios.get(`${this.couchdbUrl}`);
            console.log('✅ Connected to CouchDB:', response.data.couchdb);
            return true;
        } catch (error) {
            console.log('❌ CouchDB connection failed:', error.message);
            return false;
        }
    }

    async getDocument(docId, database = 'submissions') {
        try {
            const dbName = this.databases[database];
            const response = await axios.get(`${this.couchdbUrl}/${dbName}/${docId}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return null; // Document not found
            }
            throw error;
        }
    }

    async saveDocument(docId, document, database = 'submissions') {
        try {
            const dbName = this.databases[database];
            
            // Try to get existing document first to get _rev
            let existingDoc = null;
            try {
                existingDoc = await this.getDocument(docId, database);
            } catch (error) {
                // Document doesn't exist, which is fine
            }

            const docToSave = {
                _id: docId,
                ...document
            };

            if (existingDoc && existingDoc._rev) {
                docToSave._rev = existingDoc._rev;
            }

            const response = await axios.put(`${this.couchdbUrl}/${dbName}/${docId}`, docToSave);
            return response.data;
        } catch (error) {
            console.error('Error saving document:', error.response?.data || error.message);
            throw error;
        }
    }

    async queryDocuments(selector, database = 'submissions') {
        try {
            const dbName = this.databases[database];
            const response = await axios.post(`${this.couchdbUrl}/${dbName}/_find`, {
                selector,
                limit: 100
            });
            return response.data.docs;
        } catch (error) {
            console.error('Error querying documents:', error.response?.data || error.message);
            return [];
        }
    }

    // Submission-specific methods
    async createSubmission(submissionID, submissionData) {
        const submission = {
            type: 'submission',
            submissionID,
            documentType: submissionData.documentType,
            namaUniversitas: submissionData.namaUniversitas,
            namaProgram: submissionData.namaProgram,
            fileName: submissionData.fileName,
            submittedDate: new Date().toISOString().split('T')[0],
            submittedBy: submissionData.submittedBy,
            status: submissionData.status || 'draft',
            maxScore: submissionData.maxScore || 4,
            version: submissionData.version || 1,
            fileData: submissionData.fileData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.saveDocument(submissionID, submission);
        return submission;
    }

    async getSubmission(submissionID) {
        const doc = await this.getDocument(submissionID);
        return doc && doc.type === 'submission' ? doc : null;
    }

    async updateSubmission(submissionID, updates) {
        const existing = await this.getSubmission(submissionID);
        if (!existing) {
            throw new Error(`Submission ${submissionID} not found`);
        }

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveDocument(submissionID, updated);
        return updated;
    }

    async updateSubmissionStatus(submissionID, newStatus) {
        return this.updateSubmission(submissionID, {
            status: newStatus,
            submittedDate: newStatus === 'pending_review' ? new Date().toISOString().split('T')[0] : undefined
        });
    }

    async getSubmissionsByUser(userID) {
        const submissions = await this.queryDocuments({
            type: 'submission',
            submittedBy: userID
        });
        return submissions;
    }

    async getSubmissionsByStatus(statuses) {
        const submissions = await this.queryDocuments({
            type: 'submission',
            status: { $in: statuses }
        });
        return submissions;
    }

    async getAllSubmissions() {
        const submissions = await this.queryDocuments({
            type: 'submission'
        });
        return submissions;
    }

    // User-specific methods
    async createUser(userID, userData) {
        const user = {
            type: 'user',
            userID,
            username: userData.username,
            hashedPassword: userData.hashedPassword || userData.password, // In production, hash this
            role: userData.role,
            name: userData.name,
            university: userData.university,
            program: userData.program,
            specialization: userData.specialization,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.saveDocument(`user_${userID}`, user);
        return user;
    }

    async getUser(userID) {
        const doc = await this.getDocument(`user_${userID}`);
        return doc && doc.type === 'user' ? doc : null;
    }

    async getUserByUsername(username) {
        const users = await this.queryDocuments({
            type: 'user',
            username: username
        });
        return users.length > 0 ? users[0] : null;
    }

    async getAllUsers() {
        const users = await this.queryDocuments({
            type: 'user'
        });
        return users;
    }

    // Assessment-specific methods
    async createAssessment(assessmentID, assessmentData) {
        const assessment = {
            type: 'assessment',
            assessmentID,
            submissionId: assessmentData.submissionId,
            assessorId: assessmentData.assessorId,
            criteria: assessmentData.criteria || {},
            overallScore: assessmentData.overallScore || 0,
            status: assessmentData.status || 'in_progress',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.saveDocument(`assessment_${assessmentID}`, assessment);
        return assessment;
    }

    async getAssessment(assessmentID) {
        const doc = await this.getDocument(`assessment_${assessmentID}`);
        return doc && doc.type === 'assessment' ? doc : null;
    }

    async updateAssessment(assessmentID, updates) {
        const existing = await this.getAssessment(assessmentID);
        if (!existing) {
            throw new Error(`Assessment ${assessmentID} not found`);
        }

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveDocument(`assessment_${assessmentID}`, updated);
        return updated;
    }
}

// Singleton instance
let couchDBInstance = null;

module.exports = {
    getCouchDBConnector: async () => {
        if (!couchDBInstance) {
            couchDBInstance = new CouchDBConnector();
            const isConnected = await couchDBInstance.testConnection();
            if (!isConnected) {
                console.log('⚠️  CouchDB not available, API will use fallback data');
            }
        }
        return couchDBInstance;
    },
    CouchDBConnector
};