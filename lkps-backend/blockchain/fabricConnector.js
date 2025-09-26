const axios = require('axios');
const path = require('path');
const fs = require('fs');

class BlockchainConnector {
    constructor() {
        // CouchDB configuration for Hyperledger Fabric
        // Peer CouchDB instances dari fablo-target configuration
        this.couchDbConfigs = [
            {
                name: 'peer0-org1',
                url: 'http://localhost:5100', // Default CouchDB port untuk peer0.org1
                database: 'my-channel1_chaincode-submission-ts' // channel_chaincode format
            },
            {
                name: 'peer1-org1', 
                url: 'http://localhost:5101', // Default CouchDB port untuk peer1.org1
                database: 'my-channel1_chaincode-submission-ts'
            }
        ];
        
        // Use first peer as primary
        this.primaryCouch = this.couchDbConfigs[0];
    }

    async connect() {
        try {
            console.log('🔗 Connecting to CouchDB for blockchain data...');
            
            // Test connection to CouchDB
            const response = await axios.get(`${this.primaryCouch.url}/`);
            
            if (response.data && response.data.couchdb) {
                console.log(`✅ Connected to CouchDB: ${response.data.couchdb}`);
                
                // Check if database exists
                try {
                    await axios.get(`${this.primaryCouch.url}/${this.primaryCouch.database}`);
                    console.log(`✅ Database ${this.primaryCouch.database} exists`);
                } catch (error) {
                    if (error.response && error.response.status === 404) {
                        console.log(`⚠️ Database ${this.primaryCouch.database} not found - this is normal if no data has been stored yet`);
                    } else {
                        throw error;
                    }
                }
                
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to connect to CouchDB:', error.message);
            console.log('📝 Note: Make sure Hyperledger Fabric network is running with CouchDB');
            throw error;
        }
    }

    async disconnect() {
        console.log('🔌 Blockchain connector closed');
    }

    // Generic method to query CouchDB
    async queryCouch(selector = {}, limit = 100) {
        try {
            const queryBody = {
                selector: selector,
                limit: limit
            };

            const response = await axios.post(
                `${this.primaryCouch.url}/${this.primaryCouch.database}/_find`,
                queryBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.docs || [];
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('⚠️ Database or documents not found - returning empty array');
                return [];
            }
            console.error('❌ Error querying CouchDB:', error.message);
            throw error;
        }
    }

    // Get document by ID from CouchDB
    async getDocument(docId) {
        try {
            const response = await axios.get(`${this.primaryCouch.url}/${this.primaryCouch.database}/${docId}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new Error(`Document ${docId} not found`);
            }
            console.error('❌ Error getting document:', error.message);
            throw error;
        }
    }

    // Submission related methods
    async getAllSubmissions() {
        try {
            console.log('📊 Fetching all submissions from blockchain...');
            
            // Query for submissions - look for documents that have submissionID field
            const submissions = await this.queryCouch({
                submissionID: { "$exists": true }
            });

            console.log(`✅ Found ${submissions.length} submissions in blockchain`);
            
            // Transform blockchain data to match frontend format
            return submissions.map(doc => ({
                id: doc.submissionID || doc._id,
                documentType: doc.documentType || 'LKPS',
                namaUniversitas: doc.universityName || 'N/A',
                namaProgram: doc.programName || 'N/A',
                fileName: doc.fileName || 'N/A',
                submittedDate: doc.creationDate ? new Date(doc.creationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                submittedBy: doc.submittedBy || doc.universityID,
                status: doc.status || 'draft',
                maxScore: 4,
                currentScore: doc.currentScore || 0,
                assignedTo: doc.assignedTo,
                assessmentId: doc.assessmentId,
                version: doc.version || 1,
                // Blockchain specific fields
                _id: doc._id,
                _rev: doc._rev
            }));
        } catch (error) {
            console.error('❌ Error fetching submissions from blockchain:', error.message);
            // Return empty array as fallback
            return [];
        }
    }

    async getSubmissionsByUser(userId) {
        try {
            console.log(`📊 Fetching submissions for user ${userId} from blockchain...`);
            
            const submissions = await this.queryCouch({
                "$and": [
                    { submissionID: { "$exists": true } },
                    { "$or": [
                        { submittedBy: userId },
                        { universityID: userId }
                    ]}
                ]
            });

            console.log(`✅ Found ${submissions.length} submissions for user ${userId}`);
            
            return submissions.map(doc => ({
                id: doc.submissionID || doc._id,
                documentType: doc.documentType || 'LKPS',
                namaUniversitas: doc.universityName || 'N/A',
                namaProgram: doc.programName || 'N/A',
                fileName: doc.fileName || 'N/A',
                submittedDate: doc.creationDate ? new Date(doc.creationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                submittedBy: doc.submittedBy || doc.universityID,
                status: doc.status || 'draft',
                maxScore: 4,
                currentScore: doc.currentScore || 0,
                assignedTo: doc.assignedTo,
                assessmentId: doc.assessmentId,
                version: doc.version || 1,
                _id: doc._id,
                _rev: doc._rev
            }));
        } catch (error) {
            console.error(`❌ Error fetching submissions for user ${userId}:`, error.message);
            return [];
        }
    }

    async getSubmissionsByAssessor(assessorId) {
        try {
            console.log(`📊 Fetching submissions for assessor ${assessorId} from blockchain...`);
            
            const submissions = await this.queryCouch({
                "$and": [
                    { submissionID: { "$exists": true } },
                    { "$or": [
                        { assignedTo: assessorId },
                        { status: "pending_review" },
                        { status: "in_progress" }
                    ]}
                ]
            });

            console.log(`✅ Found ${submissions.length} submissions for assessor ${assessorId}`);
            
            return submissions.map(doc => ({
                id: doc.submissionID || doc._id,
                documentType: doc.documentType || 'LKPS',
                namaUniversitas: doc.universityName || 'N/A',
                namaProgram: doc.programName || 'N/A',
                fileName: doc.fileName || 'N/A',
                submittedDate: doc.creationDate ? new Date(doc.creationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                submittedBy: doc.submittedBy || doc.universityID,
                status: doc.status || 'draft',
                maxScore: 4,
                currentScore: doc.currentScore || 0,
                assignedTo: doc.assignedTo,
                assessmentId: doc.assessmentId,
                version: doc.version || 1,
                _id: doc._id,
                _rev: doc._rev
            }));
        } catch (error) {
            console.error(`❌ Error fetching submissions for assessor ${assessorId}:`, error.message);
            return [];
        }
    }

    // Assessment related methods
    async getAllAssessments() {
        try {
            console.log('📊 Fetching all assessments from blockchain...');
            
            const assessments = await this.queryCouch({
                assessmentID: { "$exists": true }
            });

            console.log(`✅ Found ${assessments.length} assessments in blockchain`);
            
            return assessments.map(doc => ({
                id: doc.assessmentID || doc._id,
                submissionId: doc.submissionID,
                assessorId: doc.assessorID,
                criteria: doc.criteria || {},
                overallScore: doc.overallScore || 0,
                status: doc.status || 'in_progress',
                createdAt: doc.createdAt || new Date().toISOString().split('T')[0],
                updatedAt: doc.updatedAt || new Date().toISOString().split('T')[0],
                finalStatus: doc.finalStatus,
                finalComments: doc.finalComments,
                completedAt: doc.completedAt,
                _id: doc._id,
                _rev: doc._rev
            }));
        } catch (error) {
            console.error('❌ Error fetching assessments from blockchain:', error.message);
            return [];
        }
    }

    async getAssessment(assessmentId) {
        try {
            console.log(`📊 Fetching assessment ${assessmentId} from blockchain...`);
            
            // Try to get by assessment ID first
            const assessments = await this.queryCouch({
                assessmentID: assessmentId
            });

            if (assessments.length > 0) {
                const doc = assessments[0];
                return {
                    id: doc.assessmentID || doc._id,
                    submissionId: doc.submissionID,
                    assessorId: doc.assessorID,
                    criteria: doc.criteria || {},
                    overallScore: doc.overallScore || 0,
                    status: doc.status || 'in_progress',
                    createdAt: doc.createdAt || new Date().toISOString().split('T')[0],
                    updatedAt: doc.updatedAt || new Date().toISOString().split('T')[0],
                    finalStatus: doc.finalStatus,
                    finalComments: doc.finalComments,
                    completedAt: doc.completedAt,
                    _id: doc._id,
                    _rev: doc._rev
                };
            }
            
            throw new Error(`Assessment ${assessmentId} not found`);
        } catch (error) {
            console.error(`❌ Error fetching assessment ${assessmentId}:`, error.message);
            throw error;
        }
    }

    // User related methods  
    async getAllUsers() {
        try {
            console.log('📊 Fetching all users from blockchain...');
            
            const users = await this.queryCouch({
                userID: { "$exists": true }
            });

            console.log(`✅ Found ${users.length} users in blockchain`);
            
            return users.map(doc => ({
                id: doc.userID || doc._id,
                username: doc.username,
                role: doc.role,
                name: doc.name,
                university: doc.university,
                program: doc.program,
                specialization: doc.specialization,
                _id: doc._id,
                _rev: doc._rev
            }));
        } catch (error) {
            console.error('❌ Error fetching users from blockchain:', error.message);
            return [];
        }
    }

    async getUser(userId) {
        try {
            const users = await this.queryCouch({
                userID: userId
            });

            if (users.length > 0) {
                const doc = users[0];
                return {
                    id: doc.userID || doc._id,
                    username: doc.username,
                    role: doc.role,
                    name: doc.name,
                    university: doc.university,
                    program: doc.program,
                    specialization: doc.specialization,
                    _id: doc._id,
                    _rev: doc._rev
                };
            }
            
            throw new Error(`User ${userId} not found`);
        } catch (error) {
            console.error(`❌ Error fetching user ${userId}:`, error.message);
            throw error;
        }
    }

    // Statistics methods
    async getSubmissionStats(userId, role) {
        try {
            let submissions = [];
            
            if (role === 'upps') {
                submissions = await this.getSubmissionsByUser(userId);
            } else if (role === 'asesor') {
                submissions = await this.getSubmissionsByAssessor(userId);
            }

            if (role === 'upps') {
                return {
                    total: submissions.length,
                    draft: submissions.filter(s => s.status === 'draft').length,
                    pending_review: submissions.filter(s => s.status === 'pending_review').length,
                    in_progress: submissions.filter(s => s.status === 'in_progress').length,
                    approved: submissions.filter(s => s.status === 'approved').length,
                    rejected: submissions.filter(s => s.status === 'rejected').length
                };
            } else if (role === 'asesor') {
                const allSubmissions = await this.getAllSubmissions();
                const assessorSubmissions = submissions.filter(s => s.assignedTo === userId);
                const scoresSum = assessorSubmissions.filter(s => s.currentScore).reduce((acc, s) => acc + s.currentScore, 0);
                const scoresCount = Math.max(assessorSubmissions.filter(s => s.currentScore).length, 1);
                
                return {
                    pending_review: allSubmissions.filter(s => s.status === 'pending_review').length,
                    in_progress: assessorSubmissions.filter(s => s.status === 'in_progress').length,
                    completed: assessorSubmissions.filter(s => ['approved', 'rejected'].includes(s.status)).length,
                    avg_score: scoresSum / scoresCount
                };
            }
            
            return {};
        } catch (error) {
            console.error('❌ Error calculating stats:', error.message);
            return {};
        }
    }
}

// Singleton instance
let blockchainConnectorInstance = null;

module.exports = {
    getBlockchainConnector: async () => {
        if (!blockchainConnectorInstance) {
            blockchainConnectorInstance = new BlockchainConnector();
            await blockchainConnectorInstance.connect();
        }
        return blockchainConnectorInstance;
    },
    BlockchainConnector
};