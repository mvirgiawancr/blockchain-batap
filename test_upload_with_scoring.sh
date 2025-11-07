#!/bin/bash

# Test upload to verify scoring is saved to blockchain
echo "Testing upload with scoring verification..."

# Create test files
echo "Using existing LED file..."
LED_FILE="/home/virgi/blockchain-new/Laporan Evaluasi Diri Program Studi PS Magister 2025.pdf"

echo "Using existing LKPS file..."  
LKPS_FILE="/home/virgi/blockchain-new/skoring/laporan-kinerja-program-studi-aps-akademik-vokasi-dan-psppi-(2) (1).xlsx"

# Make upload request
echo "Making upload request..."
response=$(curl -X POST \
  "http://localhost:8000/api/v1/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "led_file=@$LED_FILE" \
  -F "lkps_file=@$LKPS_FILE" \
  -F "programStudi=TEST SCORING PROGRAM" \
  -F "institusi=TEST SCORING UNIVERSITY" \
  -F "programType=M" \
  -s)

echo "Upload response:"
echo "$response" | jq '.'

# Extract submission ID
submission_id=$(echo "$response" | jq -r '.submissionId')
echo "Submission ID: $submission_id"

# Wait a bit for processing
echo "Waiting 5 seconds for processing..."
sleep 5

# Check if scoring data is in API
echo "Checking API for scoring data..."
curl "http://localhost:8000/api/v1/submissions/?status=under_review" | jq --arg id "$submission_id" '.[] | select(.submissionId == $id) | .ai.scoring'

# Check if scoring data is in blockchain
echo "Checking blockchain for scoring data..."
docker exec cli.upps.akreditasi.local peer chaincode query -C akreditasi -n submission-contract -c "{\"function\":\"QuerySubmission\",\"Args\":[\"$submission_id\"]}" | jq '.ai'

# Cleanup
echo "Test completed."