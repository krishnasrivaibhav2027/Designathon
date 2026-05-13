# MEP-TMS Quick Start Guide (React + FastAPI + MongoDB)

## Project Structure Overview

```
MEP-TMS/
├── frontend/                 # React Application
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── App.js           # Main router
│   │   ├── context/         # Authentication context
│   │   ├── services/        # API services
│   │   ├── pages/           # Page components
│   │   └── components/      # Reusable components
│   └── .env
│
├── backend/                  # FastAPI Application
│   ├── main.py              # FastAPI entry point
│   ├── requirements.txt      # Python dependencies
│   ├── .env
│   ├── app/
│   │   ├── core/            # Config, database, security
│   │   ├── models/          # MongoDB models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API endpoints
│   │   └── services/        # Business logic
│   └── FASTAPI_SETUP.md
│
├── FASTAPI_API_REFERENCE.md # API documentation
└── docs/                    # Additional documentation
```

## 5-Minute Setup

### Backend Setup

**Step 1: Navigate to backend**
```bash
cd MEP-TMS/backend
```

**Step 2: Create & activate virtual environment**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Mac/Linux
```

**Step 3: Install dependencies**
```bash
pip install -r requirements.txt
```

**Step 4: Configure environment**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

**Step 5: Start MongoDB**
```bash
mongod
```

**Step 6: Run FastAPI server**
```bash
python -m uvicorn main:app --reload
```

Server runs at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

---

### Frontend Setup

**Step 1: Open new terminal, navigate to frontend**
```bash
cd MEP-TMS/frontend
```

**Step 2: Install dependencies**
```bash
npm install
```

**Step 3: Configure API endpoint (if needed)**
```bash
# Check/edit frontend/src/services/api.js
# Default: http://localhost:8000
```

**Step 4: Start React server**
```bash
npm start
```

Frontend runs at: `http://localhost:3000`

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI/UX with routing & state management |
| **API Gateway** | FastAPI | REST API with async support |
| **Database** | MongoDB | NoSQL data storage with 7 collections |
| **Authentication** | JWT + Passlib | Secure token-based auth |
| **Email** | Nodemailer | Notifications (Gmail) |
| **HTTP Client** | Axios | Frontend API requests |

---

## Core Features Implemented

### ✅ Authentication
- User registration (with role-based system)
- Login with JWT token generation
- Token validation & logout
- Role-based access control (ADMIN, COORDINATOR, TRAINER)

### ✅ Batch Management
- Create, read, update, delete batches
- Add candidates to batches
- Track batch status (PLANNED, RUNNING, COMPLETED, CLOSED)
- Attendance summary by date

### ✅ Attendance Tracking
- Mark individual attendance
- Bulk upload via CSV
- Track by candidate or batch
- Support for PRESENT/ABSENT/LEAVE statuses

### ✅ Assessment Management
- Create and record assessments
- Automatic pass/fail calculation (≥40% = PASS)
- Percentage calculation
- Batch assessment reports

### ✅ Reports & Analytics
- Feedback/rating system
- Topper calculation (based on 60% assessment + 40% attendance)
- Candidate ranking in batch
- Batch performance reports

---

## API Endpoints Quick Reference

### Authentication
```
POST   /api/auth/register       # Register user
POST   /api/auth/login          # Login (returns JWT)
GET    /api/auth/validate       # Validate token
POST   /api/auth/logout         # Logout
```

### Batches
```
POST   /api/batch/create        # Create batch
GET    /api/batch/list          # List all batches
GET    /api/batch/{id}          # Get batch details
PUT    /api/batch/{id}          # Update batch
DELETE /api/batch/{id}          # Delete batch
POST   /api/batch/{id}/candidates           # Add candidate
GET    /api/batch/{id}/candidates           # Get candidates
GET    /api/batch/{id}/attendance-summary   # Attendance summary
```

### Attendance
```
POST   /api/attendance/mark                 # Mark attendance
POST   /api/attendance/bulk-upload          # Bulk upload (CSV)
GET    /api/attendance/candidate/{id}       # Get candidate attendance
GET    /api/attendance/batch/{id}           # Get batch attendance
PUT    /api/attendance/{id}                 # Update record
```

### Assessment
```
POST   /api/assessment/create               # Create assessment
GET    /api/assessment/candidate/{id}       # Get candidate assessments
GET    /api/assessment/batch/{id}           # Get batch assessments
PUT    /api/assessment/{id}                 # Update assessment
GET    /api/assessment/batch/{id}/report    # Batch report
```

### Reports
```
POST   /api/report/feedback                 # Submit feedback
GET    /api/report/feedback/batch/{id}      # Get batch feedback
GET    /api/report/toppers/{batch_id}       # Get toppers
GET    /api/report/rank/candidate/{id}/batch/{batch_id}  # Get rank
```

---

## Database Schema

### Users Collection
```javascript
{
  email: String (unique),
  fullName: String,
  passwordHash: String,
  role: String (ADMIN|COORDINATOR|TRAINER),
  phone: String,
  assignedBatches: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Batches Collection
```javascript
{
  batchId: String (unique),
  batchName: String,
  startDate: Date,
  endDate: Date,
  status: String (PLANNED|RUNNING|COMPLETED|CLOSED),
  trainers: [String],
  candidatesCount: Number,
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Candidates Collection
```javascript
{
  email: String,
  fullName: String,
  registrationNumber: String (unique),
  batchId: String,
  phone: String,
  performanceScore: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Common Tasks

### Testing API with Thunder Client / Postman

1. **Login**
   ```
   POST http://localhost:8000/api/auth/login
   Body: {
     "email": "admin@example.com",
     "password": "password123"
   }
   ```
   Copy the `accessToken` from response.

2. **Create Batch**
   ```
   POST http://localhost:8000/api/batch/create
   Headers: Authorization: Bearer <YOUR_TOKEN>
   Body: {
     "batchName": "Python Batch",
     "startDate": "2024-01-15T09:00:00",
     "endDate": "2024-03-15T18:00:00",
     "trainers": ["trainer1"]
   }
   ```

3. **Add Candidate**
   ```
   POST http://localhost:8000/api/batch/{batch_id}/candidates
   Headers: Authorization: Bearer <YOUR_TOKEN>
   Body: {
     "email": "candidate@example.com",
     "fullName": "John Doe",
     "phone": "9876543210"
   }
   ```

### Creating MongoDB Indexes

```javascript
// In MongoDB console
db.users.createIndex({ "email": 1 }, { unique: true })
db.batches.createIndex({ "batchId": 1 }, { unique: true })
db.candidates.createIndex({ "registrationNumber": 1 }, { unique: true })
db.candidates.createIndex({ "batchId": 1 })
db.attendances.createIndex({ "batchId": 1, "candidateId": 1, "date": 1 })
db.assessments.createIndex({ "batchId": 1, "candidateId": 1 })
```

---

## Frontend Integration Example

### api.js Service
```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
});

// Intercept requests to add token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (email, password) =>
  API.post('/api/auth/login', { email, password });

export const getBatches = () =>
  API.get('/api/batch/list');

export const createBatch = (batchData) =>
  API.post('/api/batch/create', batchData);

export const markAttendance = (attendanceData) =>
  API.post('/api/attendance/mark', attendanceData);

export default API;
```

### Using in React Component
```javascript
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import * as api from '../services/api';

function BatchList() {
  const { user } = useContext(AuthContext);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    api.getBatches()
      .then(res => setBatches(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {batches.map(batch => (
        <div key={batch._id}>
          <h3>{batch.batchName}</h3>
          <p>Status: {batch.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- For MongoDB Atlas, whitelist your IP address

### "JWT token expired"
- Token expires after 24 hours (configurable)
- User needs to login again
- Check JWT_EXPIRATION_HOURS in .env

### "CORS errors in browser"
- CORS is enabled for all origins in development
- Restrict in production by updating `allow_origins` in main.py

### "Email not sending"
- Enable 2FA on Gmail
- Create App Password: https://myaccount.google.com/apppasswords
- Update EMAIL_PASSWORD in .env

---

## Performance Tips

1. **Database Indexing**: Create indexes on frequently queried fields
2. **Batch Operations**: Use bulk operations for large data imports
3. **Caching**: Cache frequently accessed reports
4. **Rate Limiting**: Implement in production
5. **Connection Pooling**: Optimize MongoDB connection pool

---

## Next Steps

1. ✅ Backend API implementation
2. ✅ Frontend application structure
3. ⏭️ Integration testing
4. ⏭️ Deploy to production (Heroku, AWS, Azure)
5. ⏭️ Add advanced features:
   - Excel file export/import
   - Automated email alerts
   - Advanced analytics dashboard
   - Mobile app support

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Deployment Guide](./ARCHITECTURE_DEPLOYMENT.md)

---

## Support & Troubleshooting

For detailed setup instructions, see:
- Backend: `backend/FASTAPI_SETUP.md`
- API Reference: `FASTAPI_API_REFERENCE.md`
- Architecture: `docs/ARCHITECTURE_DEPLOYMENT.md`
