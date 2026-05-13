const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['ATTENDANCE_ALERT', 'ABSENCE_ALERT', 'ASSESSMENT_ALERT', 'FEEDBACK_REQUEST', 'SUCCESS_UPLOAD'],
      required: true,
    },
    subject: String,
    message: String,
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
    },
    channel: {
      type: String,
      enum: ['EMAIL', 'SMS', 'PUSH'],
      default: 'EMAIL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    sentAt: Date,
    failureReason: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
