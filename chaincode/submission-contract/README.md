# Submission Contract Chaincode (TypeScript)

Hyperledger Fabric chaincode for managing accreditation submissions.

## Features

- ✅ Create and track submissions
- ✅ Attach AI recommendations
- ✅ Manage approval/rejection decisions
- ✅ Handle document revisions
- ✅ Query submissions by status, institution
- ✅ Full transaction history
- ✅ Event emissions for real-time updates

## Build & Deploy

### Build

```bash
npm install
npm run build
```

### Deploy with Fablo

Make sure this chaincode is referenced in your `fablo-config.json`:

```json
{
  "chaincodes": [
    {
      "name": "submission-contract",
      "version": "1.0",
      "lang": "node",
      "channel": "akreditasi",
      "directory": "./chaincode"
    }
  ]
}
```

Then deploy:

```bash
fablo up
```

## Chaincode Functions

### Write Operations

- **CreateSubmission** - Create new submission
- **AttachAIRecommendation** - Attach AI analysis
- **SetDecision** - Approve or reject submission
- **UpdateDocuments** - Update documents (creates new version)

### Read Operations

- **QuerySubmission** - Get submission by ID
- **QueryAllSubmissions** - Get all submissions
- **QuerySubmissionsByStatus** - Filter by status
- **QuerySubmissionsByInstitusi** - Filter by institution
- **GetSubmissionHistory** - Get full transaction history
- **SubmissionExists** - Check if submission exists

## Events

- `SubmissionCreated` - New submission created
- `AIRecommendationAttached` - AI analysis completed
- `SubmissionDecided` - Decision made
- `SubmissionDocumentsUpdated` - Documents updated

## Data Model

See `src/types.ts` for complete type definitions.
