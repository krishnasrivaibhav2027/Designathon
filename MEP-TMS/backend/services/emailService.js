const nodemailer = require('nodemailer');
const config = require('../config/config');

const transporter = nodemailer.createTransport({
  service: config.EMAIL_SERVICE,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASSWORD,
  },
});

const emailService = {
  sendAttendanceAlert: async (recipientEmail, batchName, date) => {
    try {
      await transporter.sendMail({
        from: config.EMAIL_USER,
        to: recipientEmail,
        subject: `Attendance Alert - ${batchName}`,
        html: `<p>Attendance for batch <strong>${batchName}</strong> has not been uploaded by 10:00 AM on ${date}.</p>`,
      });
      console.log(`Attendance alert sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  },

  sendAbsenceAlert: async (recipientEmail, candidateName, batchName) => {
    try {
      await transporter.sendMail({
        from: config.EMAIL_USER,
        to: recipientEmail,
        subject: `Absence Alert - ${candidateName}`,
        html: `<p>Candidate <strong>${candidateName}</strong> has been absent for 3 consecutive days in batch <strong>${batchName}</strong>.</p>`,
      });
      console.log(`Absence alert sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  },

  sendFeedbackRequest: async (recipientEmail, batchName) => {
    try {
      await transporter.sendMail({
        from: config.EMAIL_USER,
        to: recipientEmail,
        subject: `Feedback Request - ${batchName}`,
        html: `<p>We request your valuable feedback for batch <strong>${batchName}</strong>.</p><p><a href="http://localhost:3000">Submit Feedback</a></p>`,
      });
      console.log(`Feedback request sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  },

  sendSuccessNotification: async (recipientEmail, message) => {
    try {
      await transporter.sendMail({
        from: config.EMAIL_USER,
        to: recipientEmail,
        subject: 'Upload Successful',
        html: `<p>${message}</p>`,
      });
      console.log(`Success notification sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  },
};

module.exports = emailService;
