# MEP-TMS Backend Setup Instructions

## Prerequisites
- Python 3.9+
- MongoDB (local or MongoDB Atlas)
- pip (Python package manager)

## Installation & Setup

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Copy example file
cp .env.example .env

# Edit .env with your configuration:
# - MONGODB_URI (local or MongoDB Atlas)
# - JWT_SECRET_KEY (strong random key)
# - EMAIL credentials (if using email notifications)
```

### 4. Start MongoDB (if using local)
```bash
# Windows
mongod

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 5. Run Application
```bash
# Development mode with auto-reload
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using the main.py directly
python main.py
```

## Access API
- Base URL: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs` (Swagger UI)
- API ReDoc: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/api/health`

## Project Structure
```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── config.py      # Settings configuration
│   │   ├── database.py    # MongoDB connection
│   │   └── security.py    # JWT & password hashing
│   ├── models/
│   │   └── models.py      # MongoDB document models
│   ├── schemas/
│   │   └── schemas.py     # Pydantic validation schemas
│   ├── routers/
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── batch.py       # Batch management endpoints
│   │   ├── attendance.py  # Attendance tracking endpoints
│   │   ├── assessment.py  # Assessment endpoints
│   │   └── report.py      # Reports & toppers endpoints
│   └── services/
│       ├── email_service.py    # Email notifications
│       └── topper_service.py   # Topper calculation logic
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/validate` - Validate JWT token
- `POST /api/auth/logout` - Logout user

### Batch Management
- `POST /api/batch/create` - Create batch
- `GET /api/batch/list` - List all batches
- `GET /api/batch/{batch_id}` - Get batch details
- `PUT /api/batch/{batch_id}` - Update batch
- `DELETE /api/batch/{batch_id}` - Delete batch
- `POST /api/batch/{batch_id}/candidates` - Add candidate to batch
- `GET /api/batch/{batch_id}/candidates` - Get batch candidates
- `GET /api/batch/{batch_id}/attendance-summary` - Get attendance summary

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `POST /api/attendance/bulk-upload` - Bulk upload attendance (CSV)
- `GET /api/attendance/candidate/{candidate_id}` - Get candidate attendance
- `GET /api/attendance/batch/{batch_id}` - Get batch attendance
- `PUT /api/attendance/{attendance_id}` - Update attendance record

### Assessment
- `POST /api/assessment/create` - Create assessment
- `GET /api/assessment/candidate/{candidate_id}` - Get candidate assessments
- `GET /api/assessment/batch/{batch_id}` - Get batch assessments
- `PUT /api/assessment/{assessment_id}` - Update assessment
- `GET /api/assessment/batch/{batch_id}/report` - Get batch assessment report

### Reports
- `POST /api/report/feedback` - Submit feedback
- `GET /api/report/feedback/batch/{batch_id}` - Get batch feedback
- `GET /api/report/feedback/candidate/{candidate_id}` - Get candidate feedback
- `GET /api/report/toppers/{batch_id}` - Get batch toppers
- `GET /api/report/rank/candidate/{candidate_id}/batch/{batch_id}` - Get candidate rank

## Running in Docker (Optional)

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t mep-tms-backend .
docker run -p 8000:8000 --env-file .env mep-tms-backend
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env file
- For MongoDB Atlas, whitelist your IP address

### JWT Token Errors
- Ensure JWT_SECRET_KEY is set correctly
- Token may have expired (24 hours default)
- Check Authorization header format: `Bearer <token>`

### Email Not Sending
- Enable 2FA on Gmail account
- Generate App Password: https://myaccount.google.com/apppasswords
- Update EMAIL_PASSWORD in .env

## Performance Tips
- Create MongoDB indexes for frequently queried fields
- Use bulk operations for large data imports
- Cache frequent reports
- Implement rate limiting for production

## Production Deployment
- Set DEBUG=False in .env
- Use strong JWT_SECRET_KEY (min 32 characters)
- Configure CORS allowed origins
- Use MongoDB Atlas with encryption
- Deploy on services like Heroku, AWS, Azure, or DigitalOcean
- Set up CI/CD pipeline with GitHub Actions
