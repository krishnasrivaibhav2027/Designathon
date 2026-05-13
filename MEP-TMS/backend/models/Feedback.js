const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
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
    contentQuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    trainerEffectiveness: {
      type: Number,
      min: 1,
      max: 5,
    },
    comments: String,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
