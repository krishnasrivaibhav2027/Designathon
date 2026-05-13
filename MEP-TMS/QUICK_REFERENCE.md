# MEP-TMS Developer Quick Reference

## 🚀 Quick Start (5 Minutes)

### Terminal 1: Backend
```bash
cd MEP-TMS/backend
npm install
cp .env.example .env
# Edit .env: MONGODB_URI=mongodb://localhost:27017/mep-tms
npm run dev
# ✓ Server running on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd MEP-TMS/frontend
npm install
npm start
# ✓ App opens on http://localhost:3000
```

### Terminal 3: MongoDB
```bash
mongod
# or if using Homebrew
brew services start mongodb-community
```

---

## 📁 Project Structure at a Glance

```
MEP-TMS/
├── frontend/
│   ├── src/
│   │   ├── components/      → Reusable UI components
│   │   ├── pages/          → Full page components
│   │   ├── services/       → API calls (api.js, batchService.js, etc.)
│   │   ├── context/        → Global state (AuthContext)
│   │   ├── styles/         → CSS files
│   │   └── App.js          → Main router
│   ├── package.json        → Dependencies
│   └── .env.example        → Config template
│
├── backend/
│   ├── models/             → MongoDB schemas (7 files)
│   ├── controllers/        → Business logic
│   ├── routes/             → API endpoints
│   ├── middleware/         → Auth, error handling
│   ├── services/           → Email, topper logic
│   ├── config/             → Database connection
│   ├── server.js           → Express app
│   ├── package.json        → Dependencies
│   └── .env.example        → Config template
│
├── README.md
├── DATABASE_CONNECTION_GUIDE.md
├── API_INTEGRATION_GUIDE.md
├── ARCHITECTURE_DEPLOYMENT.md
├── IMPLEMENTATION_CHECKLIST.md
└── PROJECT_SUMMARY.md
```

---

## 🗄️ Database Collections Quick Reference

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| users | Authentication & roles | email, password, role |
| batches | Training batches | batchId, name, status |
| candidates | Trainees | candidateId, batch, status |
| attendance | Daily records | batch, candidate, date, status |
| assessments | Scores | batch, candidate, score |
| feedback | Trainee feedback | batch, candidate, rating |
| notifications | Alert logs | type, recipient, status |

---

## 🔐 Authentication Flow

```
1. User enters email/password on Login page
   ↓
2. Frontend POST to /api/auth/login
   ↓
3. Backend verifies credentials
   ↓
4. JWT token generated & returned
   ↓
5. Frontend stores token in localStorage
   ↓
6. All subsequent requests include Authorization header
   ↓
7. Middleware verifies token before processing request
```

**Test Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mep-tms.com","password":"password123"}'
```

---

## 🔗 API Endpoints Cheatsheet

### Auth
```
POST   /api/auth/login                    → Get JWT token
GET    /api/auth/validate                 → Verify token
```

### Batches
```
GET    /api/batches                       → List all batches
POST   /api/batches                       → Create batch (COORDINATOR/ADMIN)
GET    /api/batches/:id                   → Get batch details
PUT    /api/batches/:id                   → Update batch
GET    /api/batches/:id/candidates        → Get batch candidates
GET    /api/batches/:id/metrics           → Get batch statistics
```

### Attendance
```
POST   /api/attendance/batch/:id          → Upload attendance
GET    /api/attendance/batch/:id          → Get attendance records
GET    /api/attendance/batch/:id/stats    → Get attendance stats
```

---

## 👥 User Roles & Permissions

| Role | Can Do |
|------|--------|
| **ADMIN** | Manage users, configure system, view all batches |
| **COORDINATOR** | Create batches, manage candidates, trigger feedback, download reports |
| **TRAINER** | Upload attendance, upload assessments, view assigned batch |

**Frontend Role Check:**
```javascript
const { user } = useAuth();
if (user.role === 'COORDINATOR') {
  // Show coordinator features
}
```

**Backend Role Check:**
```javascript
router.post('/batches', roleMiddleware('COORDINATOR', 'ADMIN'), createBatch);
```

---

## 📝 Common Development Tasks

### Add New API Endpoint

1. **Create Model** (if needed)
```javascript
// backend/models/MyModel.js
const schema = new mongoose.Schema({...});
module.exports = mongoose.model('MyModel', schema);
```

2. **Create Controller**
```javascript
// backend/controllers/myController.js
exports.getMyData = async (req, res) => {
  try {
    const data = await MyModel.find();
    res.json(data);
  } catch (error) {
    next(error);
  }
};
```

3. **Create Route**
```javascript
// backend/routes/myRoutes.js
router.get('/', getMyData);
```

4. **Add to Server**
```javascript
// backend/server.js
app.use('/api/myendpoint', myRoutes);
```

### Add Frontend Page

1. **Create Component**
```javascript
// frontend/src/pages/MyPage.js
function MyPage() {
  return <div>My Page Content</div>;
}
export default MyPage;
```

2. **Add Route**
```javascript
// frontend/src/App.js
<Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />
```

3. **Add Navigation Link**
```javascript
// frontend/src/components/Navigation.js
<li><Link to="/mypage">My Page</Link></li>
```

---

## 🐛 Common Issues & Fixes

### Issue: "MongoDB Connection Failed"
```
Solution:
1. Check if mongod is running: ps aux | grep mongod
2. Start MongoDB: mongod (Windows) or brew services start mongodb-community (Mac)
3. Verify connection string in .env
```

### Issue: "Cannot GET /api/batches"
```
Solution:
1. Check if backend server is running on port 5000
2. Check if route is registered in server.js
3. Check API URL in frontend .env
```

### Issue: "Axios 401 Unauthorized"
```
Solution:
1. Token may be expired - login again
2. Token not sent in Authorization header
3. Check if token is stored in localStorage
4. Verify JWT_SECRET matches between login and token verification
```

### Issue: "CORS Error"
```
Solution:
In backend/server.js, ensure:
app.use(cors());
// or specify frontend URL:
app.use(cors({ origin: 'http://localhost:3000' }));
```

---

## 📊 Database Query Examples

### MongoDB Shell (mongosh)

```javascript
// Connect
mongosh

// Switch to database
use mep-tms

// View collections
show collections

// Find all users
db.users.find()

// Find specific batch
db.batches.findOne({ _id: ObjectId("...") })

// Count attendance records
db.attendance.countDocuments({ status: "PRESENT" })

// Update batch status
db.batches.updateOne(
  { _id: ObjectId("...") },
  { $set: { status: "COMPLETED" } }
)

// Delete old notifications
db.notifications.deleteMany({ createdAt: { $lt: Date.now() - 30*24*60*60*1000 } })

// Aggregation: Get attendance percentage per batch
db.attendance.aggregate([
  { $group: { _id: "$batch", present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] }, total: { $sum: 1 } } },
  { $project: { percentage: { $multiply: [{ $divide: ["$present", "$total"] }, 100] } } }
])
```

---

## 🧪 Testing API with cURL

```bash
# Login & get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mep-tms.com","password":"password"}' \
  | jq -r '.token')

# Use token in subsequent requests
curl http://localhost:5000/api/batches \
  -H "Authorization: Bearer $TOKEN"

# Create batch
curl -X POST http://localhost:5000/api/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name":"Java Batch",
    "program":"Core Java",
    "startDate":"2024-02-01",
    "endDate":"2024-04-01"
  }'
```

---

## 📈 Performance Monitoring

### Check Backend Logs
```bash
# Run with debug output
DEBUG=* npm run dev

# Check specific service
node --trace-warnings server.js
```

### Monitor Database
```javascript
// In mongosh
db.setProfilingLevel(2) // Enable profiling
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

### Frontend Console
```javascript
// In browser DevTools Console
localStorage.getItem('token')  // Check token
```

---

## 🚀 Deployment Checklist

Before deploying to production:
- [ ] Update JWT_SECRET in .env
- [ ] Configure production MongoDB
- [ ] Setup email credentials
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Run all tests
- [ ] Check error logs
- [ ] Backup database
- [ ] Monitor performance
- [ ] Setup alerts

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| README.md | Main overview & setup |
| DATABASE_CONNECTION_GUIDE.md | MongoDB setup & schemas |
| API_INTEGRATION_GUIDE.md | REST API documentation |
| ARCHITECTURE_DEPLOYMENT.md | System design & deployment |
| IMPLEMENTATION_CHECKLIST.md | Development progress tracker |
| PROJECT_SUMMARY.md | Complete project overview |

---

## 🔍 File Navigation Quick Links

### Frontend
- Routes: `frontend/src/App.js`
- Auth: `frontend/src/context/AuthContext.js`
- API Client: `frontend/src/services/api.js`
- Main Page: `frontend/src/pages/Dashboard.js`

### Backend
- Server: `backend/server.js`
- Database: `backend/config/database.js`
- Auth Middleware: `backend/middleware/auth.js`
- Batch Routes: `backend/routes/batchRoutes.js`

---

## 💡 Developer Tips

1. **Always use try-catch in async functions**
   ```javascript
   try {
     const data = await Model.find();
     res.json(data);
   } catch (error) {
     next(error);
   }
   ```

2. **Use environment variables for config**
   ```javascript
   const url = process.env.DATABASE_URL || 'default';
   ```

3. **Validate before saving to DB**
   ```javascript
   if (!email || !password) {
     return res.status(400).json({ message: 'Required fields' });
   }
   ```

4. **Use role middleware for authorization**
   ```javascript
   router.post('/', roleMiddleware('ADMIN', 'COORDINATOR'), handler);
   ```

5. **Implement proper error responses**
   ```javascript
   res.status(404).json({ message: 'Resource not found' });
   ```

---

## 📞 Getting Help

1. Check relevant documentation file
2. Search GitHub issues in project repo
3. Check MongoDB/Express/React official docs
4. Ask technical lead or team member
5. Create issue with error logs & context

---

**Last Updated**: May 13, 2026  
**Version**: 1.0  
**Maintained By**: Development Team
