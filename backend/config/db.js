const mongoose = require("mongoose");

/**
 * Connects to MongoDB using MONGO_URI from the environment.
 * Returns true on success, false otherwise. It never throws, so the API
 * (and /api/health) keeps running and reports the database state.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      "[db] MONGO_URI is not set. Copy .env.example to .env and add your MongoDB connection string."
    );
    return false;
  }

  try {
    await mongoose.connect(uri, {
      dbName: "student_voting",
      serverSelectionTimeoutMS: 5000,
    });
    const { host, name } = mongoose.connection;
    console.log(`[db] MongoDB connected: ${host}/${name}`);
    return true;
  } catch (error) {
    console.error(`[db] MongoDB connection failed: ${error.message}`);
    return false;
  }
};

module.exports = connectDB;
