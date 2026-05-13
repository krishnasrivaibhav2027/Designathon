const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      unique: true,
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: String,
    status: {
      type: String,
      enum: ['ACTIVE', 'DISCONTINUED', 'CLEARED', 'NOT_CLEARED', 'OFFERED', 'ONBOARDED'],
      default: 'ACTIVE',
    },
    totalAttendance: {
      type: Number,
      default: 0,
    },
    totalAbsent: {
      type: Number,
      default: 0,
    },
    sprintReviewScore: Number,
    apiCodingScore: Number,
    projectScore: Number,
    overallScore: Number,
    isTopper: {
      type: Boolean,
      default: false,
    },
    feedback: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Candidate', candidateSchema);
