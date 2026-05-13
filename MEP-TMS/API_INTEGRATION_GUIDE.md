# API Integration Guide - MEP-TMS

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints (except `/auth/login`) require JWT token in headers:
```
Authorization: Bearer <your-token>
```

---

## Authentication Endpoints

### 1. Login
**POST** `/auth/login`

**Request:**
```json
{
  "email": "trainer@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "trainer@example.com",
    "name": "John Doe",
    "role": "TRAINER"
  }
}
```

---

## Batch Management Endpoints

### 2. Get All Batches
**GET** `/batches`

**Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "batchId": "BATCH-1704067200000",
    "name": "Java Development - Batch 1",
    "program": "Core Java & Spring Boot",
    "status": "RUNNING",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-03-15T00:00:00Z",
    "trainers": [],
    "totalCandidates": 30
  }
]
```

### 3. Get Batch by ID
**GET** `/batches/:id`

**Response (200):** Single batch object

### 4. Create Batch (Coordinator/Admin only)
**POST** `/batches`

**Request:**
```json
{
  "name": "Python Development - Batch 2",
  "program": "Python & Django",
  "startDate": "2024-02-01",
  "endDate": "2024-04-01"
}
```

**Response (201):** Created batch object

### 5. Update Batch
**PUT** `/batches/:id`

**Request:**
```json
{
  "status": "COMPLETED",
  "totalCandidates": 28
}
```

**Response (200):** Updated batch object

### 6. Get Batch Candidates
**GET** `/batches/:id/candidates`

**Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "candidateId": "CAND-001",
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice@example.com",
    "status": "ACTIVE",
    "totalAttendance": 35,
    "totalAbsent": 2,
    "isTopper": false
  }
]
```

### 7. Get Batch Metrics
**GET** `/batches/:id/metrics`

**Response (200):**
```json
{
  "batchId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "totalCandidates": 30,
  "active": 28,
  "discontinued": 1,
  "cleared": 25,
  "notCleared": 3,
  "offered": 22
}
```

---

## Attendance Endpoints

### 8. Upload Attendance (Manual)
**POST** `/attendance/batch/:batchId`

**Request:**
```json
{
  "attendanceData": [
    {
      "candidateId": "CAND-001",
      "date": "2024-01-20",
      "status": "PRESENT",
      "remarks": "On time"
    },
    {
      "candidateId": "CAND-002",
      "date": "2024-01-20",
      "status": "ABSENT",
      "remarks": "Medical leave"
    }
  ]
}
```

**Response (200):**
```json
{
  "message": "Attendance uploaded",
  "records": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "batch": "65a1b2c3d4e5f6g7h8i9j0k1",
      "candidate": "65a1b2c3d4e5f6g7h8i9j0k2",
      "date": "2024-01-20",
      "status": "PRESENT",
      "version": 1
    }
  ]
}
```

### 9. Get Attendance Records
**GET** `/attendance/batch/:batchId?startDate=2024-01-01&endDate=2024-01-31`

**Response (200):**
```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "batch": "65a1b2c3d4e5f6g7h8i9j0k1",
    "candidate": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "candidateId": "CAND-001",
      "firstName": "Alice",
      "lastName": "Johnson"
    },
    "date": "2024-01-20",
    "status": "PRESENT",
    "remarks": "On time"
  }
]
```

### 10. Get Attendance Statistics
**GET** `/attendance/batch/:batchId/stats`

**Response (200):**
```json
{
  "totalCandidates": 30,
  "totalAttendanceRecords": 420,
  "totalPresent": 398,
  "totalAbsent": 22,
  "attendancePercentage": "94.76"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "message": "Required fields missing",
  "errors": ["email is required", "password is required"]
}
```

### 401 - Unauthorized
```json
{
  "message": "Invalid token"
}
```

### 403 - Forbidden
```json
{
  "message": "Insufficient permissions"
}
```

### 404 - Not Found
```json
{
  "message": "Batch not found"
}
```

### 500 - Server Error
```json
{
  "message": "Internal Server Error"
}
```

---

## Frontend Integration Examples

### Login
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'pass123' })
});
const data = await response.json();
localStorage.setItem('token', data.token);
```

### Get Batches
```javascript
const response = await fetch('http://localhost:5000/api/batches', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});
const batches = await response.json();
```

### Upload Attendance
```javascript
const response = await fetch('http://localhost:5000/api/attendance/batch/65a1b2c3d4e5f6g7h8i9j0k1', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    attendanceData: [
      { candidateId: 'CAND-001', date: '2024-01-20', status: 'PRESENT' }
    ]
  })
});
const result = await response.json();
```

---

## Rate Limiting & Throttling

- No rate limit currently implemented
- Recommended: Add rate limiting middleware for production

---

## Pagination (Future Enhancement)

Add query parameters for future pagination:
```
GET /batches?page=1&limit=20&sort=-createdAt
```

---

## Status Codes Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Testing with cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trainer@example.com","password":"password123"}'

# Get Batches
curl http://localhost:5000/api/batches \
  -H "Authorization: Bearer <your-token>"

# Create Batch
curl -X POST http://localhost:5000/api/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name":"Java Batch","program":"Core Java","startDate":"2024-02-01","endDate":"2024-04-01"}'
```

---

## Postman Collection

Import this template into Postman:
```json
{
  "info": {
    "name": "MEP-TMS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/auth/login"
      }
    },
    {
      "name": "Get All Batches",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/batches"
      }
    }
  ]
}
```

Set `base_url` variable to `http://localhost:5000/api`
