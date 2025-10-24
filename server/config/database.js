const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`Database connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected'.yellow);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Database connection closed through app termination'.yellow);
      process.exit(0);
    });

  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.underline.bold);
    console.log('Server will continue running without database functionality'.yellow);
    // Don't exit the process, allow server to run without database
  }
};

module.exports = connectDB;