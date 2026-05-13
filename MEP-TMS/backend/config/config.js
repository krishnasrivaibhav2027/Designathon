require('dotenv').config();

module.exports = {
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mep-tms',
  
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // Email Configuration
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  
  // Attendance Configuration
  ATTENDANCE_CUTOFF_TIME: process.env.ATTENDANCE_CUTOFF_TIME || '10:00', // 10:00 AM
  ABSENT_ALERT_DAYS: process.env.ABSENT_ALERT_DAYS || 3, // 3 consecutive days
  
  // File Upload Configuration
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  ALLOWED_FILE_TYPES: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                       'application/vnd.ms-excel',
                       'text/csv'],
  
  // Topper Configuration
  TOPPER_PERCENTAGE: process.env.TOPPER_PERCENTAGE || 10, // Top 10%
  
  // API Configuration
  API_PREFIX: '/api',
};
