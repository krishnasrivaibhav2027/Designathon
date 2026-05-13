# FastAPI Backend API Reference

## Base URL
```
http://localhost:8000
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Register User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "securePassword123",
  "role": "TRAINER",
  "phone": "9876543210"
}
```

**Response (201):**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "TRAINER",
  "phone": "9876543210",
  "_id": "507f1f77bcf86cd799439011",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "TRAINER",
    "_id": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

---

### Validate Token
**Endpoint:** `GET /api/auth/validate`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200):**
```json
{
  "isValid": true,
  "user": {
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "TRAINER",
    "_id": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
}
```

---

## Batch Management Endpoints

### Create Batch
**Endpoint:** `POST /api/batch/create`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "batchName": "Python Batch 2024",
  "startDate": "2024-01-15T09:00:00",
  "endDate": "2024-03-15T18:00:00",
  "trainers": ["trainer1_id", "trainer2_id"],
  "description": "Advanced Python training program"
}
```

**Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "batchId": "BATCH-A1B2C3D4",
  "batchName": "Python Batch 2024",
  "startDate": "2024-01-15T09:00:00",
  "endDate": "2024-03-15T18:00:00",
  "status": "PLANNED",
  "candidatesCount": 0,
  "trainers": ["trainer1_id", "trainer2_id"],
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### List All Batches
**Endpoint:** `GET /api/batch/list`

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "batchId": "BATCH-A1B2C3D4",
    "batchName": "Python Batch 2024",
    "status": "PLANNED",
    "candidatesCount": 25,
    "startDate": "2024-01-15T09:00:00",
    "endDate": "2024-03-15T18:00:00",
    "trainers": ["trainer1_id", "trainer2_id"],
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
]
```

---

### Get Batch Details
**Endpoint:** `GET /api/batch/{batch_id}`

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "batchId": "BATCH-A1B2C3D4",
  "batchName": "Python Batch 2024",
  "status": "PLANNED",
  "candidatesCount": 25,
  "startDate": "2024-01-15T09:00:00",
  "endDate": "2024-03-15T18:00:00",
  "trainers": ["trainer1_id", "trainer2_id"],
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### Add Candidate to Batch
**Endpoint:** `POST /api/batch/{batch_id}/candidates`

**Request Body:**
```json
{
  "email": "candidate@example.com",
  "fullName": "Jane Doe",
  "batchId": "507f1f77bcf86cd799439011",
  "phone": "9876543210"
}
```

**Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "email": "candidate@example.com",
  "fullName": "Jane Doe",
  "registrationNumber": "REG-ABC123",
  "batchId": "507f1f77bcf86cd799439011",
  "phone": "9876543210",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

## Attendance Endpoints

### Mark Attendance
**Endpoint:** `POST /api/attendance/mark`

**Request Body:**
```json
{
  "batchId": "507f1f77bcf86cd799439011",
  "candidateId": "507f1f77bcf86cd799439012",
  "date": "2024-01-15T09:00:00",
  "status": "PRESENT"
}
```

**Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "batchId": "507f1f77bcf86cd799439011",
  "candidateId": "507f1f77bcf86cd799439012",
  "date": "2024-01-15T09:00:00",
  "status": "PRESENT",
  "version": 1,
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### Get Candidate Attendance
**Endpoint:** `GET /api/attendance/candidate/{candidate_id}`

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "batchId": "507f1f77bcf86cd799439011",
    "candidateId": "507f1f77bcf86cd799439012",
    "date": "2024-01-15T09:00:00",
    "status": "PRESENT",
    "version": 1,
    "createdAt": "2024-01-01T10:00:00",
    "updatedAt": "2024-01-01T10:00:00"
  }
]
```

---

## Assessment Endpoints

### Create Assessment
**Endpoint:** `POST /api/assessment/create`

**Request Body:**
```json
{
  "batchId": "507f1f77bcf86cd799439011",
  "candidateId": "507f1f77bcf86cd799439012",
  "assessmentName": "Module 1 Test",
  "totalScore": 100,
  "obtainedScore": 85
}
```

**Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "batchId": "507f1f77bcf86cd799439011",
  "candidateId": "507f1f77bcf86cd799439012",
  "assessmentName": "Module 1 Test",
  "totalScore": 100,
  "obtainedScore": 85,
  "percentage": 85.0,
  "result": "PASS",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

### Get Batch Assessment Report
**Endpoint:** `GET /api/assessment/batch/{batch_id}/report`

**Response (200):**
```json
{
  "batchId": "507f1f77bcf86cd799439011",
  "batchName": "Python Batch 2024",
  "totalCandidates": 25,
  "totalAttendance": 500,
  "averageScore": 78.5,
  "assessmentsPassed": 23,
  "assessmentsFailed": 2
}
```

---

## Report Endpoints

### Get Batch Toppers
**Endpoint:** `GET /api/report/toppers/{batch_id}`

**Response (200):**
```json
{
  "batchId": "507f1f77bcf86cd799439011",
  "batchName": "Python Batch 2024",
  "toppers": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "candidate@example.com",
      "fullName": "Jane Doe",
      "registrationNumber": "REG-ABC123",
      "overallScore": 92.5,
      "assessmentScore": 90.0,
      "attendancePercentage": 95.0
    }
  ]
}
```

---

### Get Candidate Rank
**Endpoint:** `GET /api/report/rank/candidate/{candidate_id}/batch/{batch_id}`

**Response (200):**
```json
{
  "rank": 2,
  "totalCandidates": 25,
  "percentile": 92.0,
  "score": 88.5
}
```

---

## Error Responses

### Unauthorized (401)
```json
{
  "detail": "Invalid authentication credentials"
}
```

### Forbidden (403)
```json
{
  "detail": "Insufficient permissions"
}
```

### Not Found (404)
```json
{
  "detail": "Batch not found"
}
```

### Bad Request (400)
```json
{
  "detail": "Invalid request data"
}
```

---

## Using with React Frontend

Update your `api.js` file:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Create Batch (with token)
```bash
curl -X POST http://localhost:8000/api/batch/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "batchName": "Batch 1",
    "startDate": "2024-01-15T09:00:00",
    "endDate": "2024-03-15T18:00:00",
    "trainers": ["trainer1"]
  }'
```
