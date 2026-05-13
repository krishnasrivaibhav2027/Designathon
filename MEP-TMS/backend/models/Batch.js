const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    program: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PLANNED', 'RUNNING', 'COMPLETED', 'CLOSED'],
      default: 'PLANNED',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    trainers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    coordinators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    totalCandidates: {
      type: Number,
      default: 0,
    },
    assessmentDates: [{
      type: {
        type: String, // 'SPRINT_REVIEW', 'API_CODING', 'PROJECT'
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
    }],
    totalAbsentThreshold: {
      type: Number,
      default: 3, // Alert after 3 consecutive absences
    },
    attendanceCutoffTime: {
      type: String,
      default: '10:00', // 10:00 AM
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Batch', batchSchema);
