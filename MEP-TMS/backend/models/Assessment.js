const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    assessmentType: {
      type: String,
      enum: ['SPRINT_REVIEW', 'API_CODING', 'PROJECT'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    passThreshold: {
      type: Number,
      default: 40, // 40%
    },
    remarks: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique assessment per candidate per type
assessmentSchema.index({ batch: 1, candidate: 1, assessmentType: 1 }, { unique: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
