# Database Connection Guide for MongoDB

## Why MongoDB?

1. **Flexible Schema**: Training data varies; MongoDB's document model accommodates different data structures
2. **Scalability**: Horizontal scaling handles growing batches and candidates
3. **Performance**: Fast queries for real-time dashboards and reports
4. **Developer-Friendly**: JSON-like documents match JavaScript/Node.js naturally
5. **Automatic Indexing**: Efficient queries on frequently accessed fields

## Connection Methods

### 1. Local MongoDB (Development)

**Installation:**
```bash
# Windows (Chocolatey)
choco install mongodb-community

# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Linux (Ubuntu)
sudo apt-get install -y mongodb
```

**Start Service:**
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Connection String:**
```
mongodb://localhost:27017/mep-tms
```

**Verify Connection:**
```bash
mongosh
use mep-tms
db.users.find()
```

---

### 2. MongoDB Atlas (Cloud - Recommended for Production)

**Step 1: Create Account**
- Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Sign up with email or Google account

**Step 2: Create Cluster**
- Click "Create a Deployment"
- Choose "M0 Sandbox" (free tier for dev)
- Select region close to your location
- Click "Create Deployment"

**Step 3: Configure Network Access**
- Go to "Network Access"
- Click "Add IP Address"
- Select "Allow access from anywhere" (0.0.0.0/0) for development
- For production, add specific IP addresses

**Step 4: Get Connection String**
- Click "Databases"
- Click "Connect" on your cluster
- Select "Connect your application"
- Choose Node.js driver
- Copy connection string

**Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/mep-tms?retryWrites=true&w=majority
```

**Update .env:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mep-tms?retryWrites=true&w=majority
```

---

## Mongoose Configuration (Node.js Backend)

The database connection is already configured in `/backend/config/database.js`:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ MongoDB Connected');
  } catch (error) {
    console.error('✗ Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## Collection Indexes for Performance

Auto-created by Mongoose schema definitions:

```javascript
// Users - Quick lookup by email
db.users.createIndex({ email: 1 }, { unique: true })

// Batches - Filter by status
db.batches.createIndex({ status: 1, startDate: -1 })

// Attendance - Unique per candidate per date
db.attendance.createIndex({ batch: 1, candidate: 1, date: 1 }, { unique: true })

// Candidates - Find by batch
db.candidates.createIndex({ batch: 1, status: 1 })

// Assessments - Performance metrics
db.assessments.createIndex({ batch: 1, candidate: 1, assessmentType: 1 })
```

---

## Sample Data Setup

**Create Admin User:**
```javascript
db.users.insertOne({
  email: "admin@mep-tms.com",
  password: "hashed_password", // Use bcrypt in production
  firstName: "Admin",
  lastName: "User",
  role: "ADMIN",
  isActive: true,
  createdAt: new Date()
})
```

**Create Sample Batch:**
```javascript
db.batches.insertOne({
  batchId: "BATCH-2024-001",
  name: "Java Development - Batch 1",
  program: "Core Java & Spring Boot",
  status: "RUNNING",
  startDate: new Date("2024-01-15"),
  endDate: new Date("2024-03-15"),
  trainers: [],
  coordinators: [],
  totalCandidates: 30,
  attendanceCutoffTime: "10:00",
  createdAt: new Date()
})
```

---

## Backup & Restore

### MongoDB Atlas Backup:
```bash
# Automatic daily backups enabled by default
# Restore through web console: Atlas → Backups → Restore
```

### Local MongoDB Backup:
```bash
# Backup
mongodump --db mep-tms --out ./backups/

# Restore
mongorestore --db mep-tms ./backups/mep-tms
```

---

## Monitoring & Optimization

### Check Connection Status:
```bash
mongosh
db.adminCommand({ ping: 1 })
```

### Monitor Queries:
```javascript
// Enable profiling
db.setProfilingLevel(2)

// View slow queries
db.system.profile.find({ millis: { $gt: 1000 } }).pretty()
```

### Index Usage:
```javascript
db.collection.aggregate([
  { $match: { /* your query */ } }
]).explain("executionStats")
```

---

## Common Connection Issues

| Error | Solution |
|-------|----------|
| `connect ECONNREFUSED` | MongoDB service not running - start `mongod` |
| `authentication failed` | Check username/password in connection string |
| `getaddrinfo ENOTFOUND` | Invalid hostname - verify Atlas cluster name |
| `EHOSTUNREACH` | Network access not allowed - add IP in Atlas console |
| `TIMEOUT` | Network latency - increase timeout or check network |

---

## Best Practices

1. **Use Connection Pooling**: Mongoose handles this automatically
2. **Enable SSL/TLS**: Required for Atlas connections
3. **Implement Retry Logic**: Network issues may occur
4. **Index Strategically**: Don't over-index; monitor performance
5. **Archive Old Data**: Move completed batches to archive collection
6. **Monitor Disk Space**: Atlas free tier has 512MB limit
7. **Use Transactions**: For multi-document operations consistency

---

## Next Steps

1. Choose MongoDB deployment (local or Atlas)
2. Update `.env` file with connection string
3. Run `npm install` in backend folder
4. Start server: `npm run dev`
5. Seed initial data using provided scripts
6. Access backend: `http://localhost:5000/health`
