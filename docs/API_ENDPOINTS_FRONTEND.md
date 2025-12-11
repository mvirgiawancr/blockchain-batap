# API Endpoints untuk Frontend Pages

Dokumentasi ini menjelaskan API endpoints yang dibutuhkan untuk setiap halaman frontend yang sudah dibuat.

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
Semua request (kecuali login) memerlukan header:
```
Authorization: Bearer <token>
```

---

## 1. UPPS Pages

### 1.1 Assessors Info Page
**Endpoint:** `GET /assessors`

**Response:**
```json
[
  {
    "id": "assessor_001",
    "name": "Dr. John Doe",
    "fullName": "Dr. John Doe, M.Eng",
    "institution": "Universitas Indonesia",
    "expertise": "Teknik Informatika",
    "rating": 4.8,
    "totalAssignments": 12,
    "email": "john@example.com",
    "phone": "+62812345678"
  }
]
```

---

### 1.2 Notifications Page
**Endpoint:** `GET /notifications`

**Response:**
```json
[
  {
    "id": "notif_001",
    "title": "Submission Disetujui",
    "message": "Submission Anda untuk program Teknik Informatika telah disetujui",
    "type": "success", // success, warning, error, info
    "isRead": false,
    "createdAt": "2024-12-01T10:30:00Z"
  }
]
```

**Mark as Read:**
`PUT /notifications/:id/read`

**Mark All as Read:**
`PUT /notifications/read-all`

**Delete Notification:**
`DELETE /notifications/:id`

---

## 2. Sekretariat Pages

### 2.1 Verify Documents Page
**Get Submissions:**
`GET /sekretariat/submissions`

**Response:**
```json
[
  {
    "submissionId": "SUB_001",
    "programStudi": "Teknik Informatika",
    "institusi": "Universitas Indonesia",
    "jenjang": "S1",
    "status": "pending", // pending, under_review, approved, rejected
    "createdAt": "2024-12-01T10:00:00Z",
    "assignedAssessors": null
  }
]
```

**Verify Submission:**
`POST /sekretariat/verify/:submissionId`

**Request Body:**
```json
{
  "decision": "approve", // approve, reject
  "notes": "Dokumen lengkap dan sesuai"
}
```

---

### 2.2 UPPS Management Page
**Get All UPPS:**
`GET /sekretariat/upps`

**Response:**
```json
[
  {
    "username": "upps_ui",
    "fullName": "UPPS Universitas Indonesia",
    "institution": "Universitas Indonesia",
    "email": "upps@ui.ac.id",
    "phone": "+62218000000",
    "totalSubmissions": 5
  }
]
```

---

### 2.3 Payment Verification Page
**Get Payments:**
`GET /sekretariat/payments`

**Response:**
```json
[
  {
    "id": "pay_001",
    "submissionId": "SUB_001",
    "uppsName": "UPPS UI",
    "amount": 5000000,
    "status": "pending", // pending, verified, rejected
    "proofUrl": "https://ipfs.io/ipfs/Qm...",
    "createdAt": "2024-12-01T10:00:00Z"
  }
]
```

**Verify Payment:**
`POST /sekretariat/payments/:id/verify`

**Request Body:**
```json
{
  "decision": "approve" // approve, reject
}
```

---

### 2.4 Reports Page
**Get Statistics:**
`GET /sekretariat/reports?range=month`

**Query Parameters:**
- `range`: week, month, quarter, year

**Response:**
```json
{
  "totalSubmissions": 50,
  "pending": 10,
  "approved": 35,
  "rejected": 5,
  "totalUPPS": 20,
  "totalPayments": 45000000
}
```

**Download Report:**
`GET /sekretariat/reports/download?type=submissions&range=month`

**Query Parameters:**
- `type`: submissions, payments, upps, comprehensive
- `range`: week, month, quarter, year

**Response:** PDF file

---

## 3. KEA Pages

### 3.1 Assessor Assignment Page
**Get Approved Submissions:**
`GET /kea/submissions-approved`

**Response:**
```json
[
  {
    "submissionId": "SUB_001",
    "programStudi": "Teknik Informatika",
    "institusi": "Universitas Indonesia",
    "jenjang": "S1",
    "assignedAssessors": null
  }
]
```

**Get Available Assessors:**
`GET /kea/assessors`

**Response:**
```json
[
  {
    "id": "asesor_001",
    "name": "Dr. Jane Doe",
    "expertise": "Teknik Informatika",
    "totalAssignments": 8
  }
]
```

**Assign Assessors:**
`POST /kea/assign/:submissionId`

**Request Body:**
```json
{
  "assessorIds": ["asesor_001", "asesor_002"]
}
```

---

### 3.2 Monitoring Page
**Get All Assignments:**
`GET /kea/monitoring`

**Response:**
```json
[
  {
    "id": "assign_001",
    "submissionId": "SUB_001",
    "programStudi": "Teknik Informatika",
    "institusi": "Universitas Indonesia",
    "assessorName": "Dr. Jane Doe",
    "status": "in_progress", // pending, in_progress, completed
    "progress": 75, // 0-100
    "assignedAt": "2024-12-01T10:00:00Z",
    "score": null // atau angka jika sudah selesai
  }
]
```

---

## 4. Asesor Pages

### 4.1 Assignments Page (Sudah Ada)
**Get My Assignments:**
`GET /asesor/assignments` atau `GET /assessor/assignments`

---

## 5. Common Endpoints

### 5.1 Submissions
**Get User's Submissions:**
`GET /submissions`

**Response:**
```json
[
  {
    "submissionId": "SUB_001",
    "programStudi": "Teknik Informatika",
    "institusi": "Universitas Indonesia",
    "jenjang": "S1",
    "status": "approved",
    "createdAt": "2024-12-01T10:00:00Z",
    "ledCid": "Qm...",
    "lkpsCid": "Qm...",
    "ai": {
      "scoring": {
        "finalScore": 85.5,
        "maxPossibleScore": 100
      }
    }
  }
]
```

---

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes

1. Semua endpoint yang mengembalikan array harus mengembalikan empty array `[]` jika tidak ada data
2. Gunakan ISO 8601 format untuk tanggal: `2024-12-01T10:00:00Z`
3. Pastikan semua endpoint memvalidasi token JWT
4. Filter data berdasarkan role user yang login
5. Untuk pagination (opsional): tambahkan query params `?page=1&limit=10`
