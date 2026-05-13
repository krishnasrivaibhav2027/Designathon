# Maverick Execution Platform - Training Management System (MEP-TMS)

## Project Structure

```
MEP-TMS/
├── frontend/                 # React Frontend Application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Page-level components
│   │   ├── services/        # API services (axios instances)
│   │   ├── context/         # React Context (Auth, User)
│   │   ├── styles/          # CSS stylesheets
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
│
├── backend/                  # Node.js/Express Backend
│   ├── config/
│   │   ├── config.js        # Configuration management
│   │   └── database.js      # MongoDB connection
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Batch.js
│   │   ├── Candidate.js
│   │   ├── Attendance.js
│   │   ├── Assessment.js
│   │   ├── Notification.js
│   │   └── Feedback.js
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── batchController.js
│   │   └── attendanceController.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── batchRoutes.js
│   │   └── attendanceRoutes.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js         # JWT authentication
│   │   └── errorHandler.js
│   ├── services/            # External services
│   │   ├── emailService.js
│   │   └── topperService.js
│   ├── utils/               # Utility functions
│   ├── server.js            # Express app entry point
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js v14+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and setup backend:**
```bash
cd MEP-TMS/backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and email credentials
npm run dev
```

2. **Setup frontend:**
```bash
cd MEP-TMS/frontend
npm install
cp .env.example .env
npm start
```

3. **Database seed (optional):**
Create initial admin user and test batches using MongoDB shell or Compass.

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Validate JWT token

### Batch Endpoints
- `GET /api/batches` - Get all batches
- `POST /api/batches` - Create batch (Coordinator/Admin)
- `GET /api/batches/:id` - Get batch details
- `PUT /api/batches/:id` - Update batch
- `GET /api/batches/:id/candidates` - Get batch candidates
- `GET /api/batches/:id/metrics` - Get batch metrics

### Attendance Endpoints
- `POST /api/attendance/batch/:batchId` - Upload attendance
- `GET /api/attendance/batch/:batchId` - Get attendance records
- `GET /api/attendance/batch/:batchId/stats` - Get attendance stats

## Database Connection Setup

### Option 1: Local MongoDB

1. **Install MongoDB:**
```bash
# Windows - Download from mongodb.com or use Chocolatey
choco install mongodb-community

# macOS
brew tap mongodb/brew
brew install mongodb-community

# Linux (Ubuntu)
sudo apt-get install -y mongodb
```

2. **Start MongoDB:**
```bash
# Windows
mongod

# macOS/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

3. **Configure .env:**
```
MONGODB_URI=mongodb://localhost:27017/mep-tms
```

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account:**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up and create a cluster

2. **Get Connection String:**
   - Click "Connect" → "Connect your application"
   - Copy the connection string

3. **Configure .env:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mep-tms?retryWrites=true&w=majority
```

## MongoDB Collections (Schema)

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String (ADMIN, COORDINATOR, TRAINER),
  isActive: Boolean,
  assignedBatches: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### Batches Collection
```javascript
{
  _id: ObjectId,
  batchId: String (unique),
  name: String,
  program: String,
  status: String (PLANNED, RUNNING, COMPLETED, CLOSED),
  startDate: Date,
  endDate: Date,
  trainers: [ObjectId],
  coordinators: [ObjectId],
  totalCandidates: Number,
  assessmentDates: [{ type: String, date: Date }],
  attendanceCutoffTime: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Candidates Collection
```javascript
{
  _id: ObjectId,
  candidateId: String (unique),
  batch: ObjectId (ref: Batch),
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  status: String (ACTIVE, DISCONTINUED, CLEARED, NOT_CLEARED, OFFERED, ONBOARDED),
  totalAttendance: Number,
  totalAbsent: Number,
  sprintReviewScore: Number,
  apiCodingScore: Number,
  projectScore: Number,
  overallScore: Number,
  isTopper: Boolean,
  feedback: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Collection
```javascript
{
  _id: ObjectId,
  batch: ObjectId (ref: Batch),
  candidate: ObjectId (ref: Candidate),
  date: Date,
  status: String (PRESENT, ABSENT, LEAVE),
  remarks: String,
  uploadedBy: ObjectId (ref: User),
  uploadedAt: Date,
  version: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Assessments Collection
```javascript
{
  _id: ObjectId,
  batch: ObjectId (ref: Batch),
  candidate: ObjectId (ref: Candidate),
  assessmentType: String (SPRINT_REVIEW, API_CODING, PROJECT),
  score: Number,
  maxScore: Number,
  percentage: Number,
  isPassed: Boolean,
  remarks: String,
  uploadedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

## Key Features Implementation

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, COORDINATOR, TRAINER)
- Protected routes middleware

### 2. Batch Management
- Create, update, view batches
- Assign trainers and coordinators
- Upload candidate master data

### 3. Attendance Tracking
- Manual and Excel-based uploads
- Daily attendance monitoring
- Absence alerts (3+ consecutive days)
- Attendance statistics

### 4. Assessment Management
- Multi-type assessment support
- Score validation and mapping
- Automated clearance calculation

### 5. Notifications & Alerts
- Email notifications
- Attendance cut-off alerts
- Absence escalation
- Feedback requests

### 6. Reporting & Analytics
- Batch-wise reports
- Candidate status tracking
- Topper identification
- Performance dashboards

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/mep-tms
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ATTENDANCE_CUTOFF_TIME=10:00
ABSENT_ALERT_DAYS=3
TOPPER_PERCENTAGE=10
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## Common Issues & Solutions

### MongoDB Connection Failed
- Ensure MongoDB service is running
- Check MONGODB_URI format
- Verify network access (for Atlas)

### Email Not Sending
- Enable "Less secure app access" (Gmail)
- Use app-specific passwords for Gmail
- Check SMTP credentials

### CORS Issues
- Verify frontend URL in backend CORS config
- Check proxy settings in frontend package.json

## Next Steps

1. Create additional controllers (assessments, reports, feedback)
2. Implement file upload handlers (Excel import)
3. Add unit and integration tests
4. Deploy to production servers
5. Set up CI/CD pipeline
6. Configure monitoring and logging

## Support

For issues or questions, please refer to the project documentation or contact the development team.
