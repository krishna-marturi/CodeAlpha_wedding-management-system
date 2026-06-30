const mongoose = require('mongoose');
const { JsonModel } = require('./jsonDb');

let isFallback = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_management';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to fallback if server not running
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    isFallback = false;
  } catch (error) {
    console.warn(`\n[WARNING] MongoDB Connection failed!`);
    console.warn(`[WARNING] Falling back to JSON file storage mode in backend/data/`);
    console.warn(`[WARNING] Error details: ${error.message}\n`);
    isFallback = true;
  }
};

const getModel = (modelName, mongooseModel) => {
  // Return the JSON model simulator if MongoDB is not available
  if (isFallback) {
    return new JsonModel(modelName);
  }
  return mongooseModel;
};

module.exports = {
  connectDB,
  getModel,
  getIsFallback: () => isFallback
};
