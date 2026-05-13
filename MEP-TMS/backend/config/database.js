const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB:', config.MONGODB_URI);
    
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✓ MongoDB Connected Successfully');
    
    // Monitor connection events
    mongoose.connection.on('disconnected', () => {
      console.log('⚠ MongoDB Disconnected');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('✗ MongoDB Connection Error:', err);
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
