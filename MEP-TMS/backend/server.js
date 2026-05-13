require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config/config');

// Routes
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use(`${config.API_PREFIX}/auth`, authRoutes);
app.use(`${config.API_PREFIX}/batches`, batchRoutes);
app.use(`${config.API_PREFIX}/attendance`, attendanceRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  MEP-TMS Backend Server Started            ║
║  Environment: ${config.NODE_ENV.padEnd(27)}║
║  Port: ${PORT.toString().padEnd(35)}║
║  MongoDB: ${config.MONGODB_URI.padEnd(27)}║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
