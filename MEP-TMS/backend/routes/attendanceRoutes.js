const express = require('express');
const {
  uploadAttendance,
  getAttendanceRecords,
  getAttendanceStats,
} = require('../controllers/attendanceController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Upload attendance
router.post('/batch/:batchId', roleMiddleware('TRAINER', 'COORDINATOR'), uploadAttendance);

// Get attendance records
router.get('/batch/:batchId', getAttendanceRecords);

// Get attendance statistics
router.get('/batch/:batchId/stats', getAttendanceStats);

module.exports = router;
