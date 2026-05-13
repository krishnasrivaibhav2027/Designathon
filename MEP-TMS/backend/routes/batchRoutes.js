const express = require('express');
const {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  getBatchCandidates,
  getBatchMetrics,
} = require('../controllers/batchController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all batches
router.get('/', getAllBatches);

// Get batch by ID
router.get('/:id', getBatchById);

// Create batch (Coordinator and Admin only)
router.post('/', roleMiddleware('COORDINATOR', 'ADMIN'), createBatch);

// Update batch (Coordinator and Admin only)
router.put('/:id', roleMiddleware('COORDINATOR', 'ADMIN'), updateBatch);

// Get batch candidates
router.get('/:id/candidates', getBatchCandidates);

// Get batch metrics
router.get('/:id/metrics', getBatchMetrics);

module.exports = router;
