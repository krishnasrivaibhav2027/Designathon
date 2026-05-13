const Batch = require('../models/Batch');
const Candidate = require('../models/Candidate');
const User = require('../models/User');

// Get all batches
exports.getAllBatches = async (req, res, next) => {
  try {
    const batches = await Batch.find()
      .populate('trainers', 'firstName lastName email')
      .populate('coordinators', 'firstName lastName email');
    
    res.json(batches);
  } catch (error) {
    next(error);
  }
};

// Get batch by ID
exports.getBatchById = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('trainers', 'firstName lastName email')
      .populate('coordinators', 'firstName lastName email');
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    res.json(batch);
  } catch (error) {
    next(error);
  }
};

// Create batch
exports.createBatch = async (req, res, next) => {
  try {
    const { name, program, startDate, endDate } = req.body;

    if (!name || !program || !startDate || !endDate) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const batchId = `BATCH-${Date.now()}`;
    const batch = new Batch({
      batchId,
      name,
      program,
      startDate,
      endDate,
    });

    await batch.save();
    res.status(201).json(batch);
  } catch (error) {
    next(error);
  }
};

// Update batch
exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    next(error);
  }
};

// Get batch candidates
exports.getBatchCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ batch: req.params.id });
    res.json(candidates);
  } catch (error) {
    next(error);
  }
};

// Get batch metrics
exports.getBatchMetrics = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const candidates = await Candidate.find({ batch: req.params.id });
    const totalCandidates = candidates.length;
    
    const metrics = {
      batchId: batch._id,
      totalCandidates,
      active: candidates.filter(c => c.status === 'ACTIVE').length,
      discontinued: candidates.filter(c => c.status === 'DISCONTINUED').length,
      cleared: candidates.filter(c => c.status === 'CLEARED').length,
      notCleared: candidates.filter(c => c.status === 'NOT_CLEARED').length,
      offered: candidates.filter(c => c.status === 'OFFERED').length,
    };

    res.json(metrics);
  } catch (error) {
    next(error);
  }
};
