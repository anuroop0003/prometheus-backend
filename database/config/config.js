import mongoose from "mongoose";

let cachedHelper = global.mongoose;

if (!cachedHelper) {
  cachedHelper = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cachedHelper.conn) {
    return cachedHelper.conn;
  }

  if (!cachedHelper.promise) {
    const opts = {
      bufferCommands: false,
    };

    cachedHelper.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cachedHelper.conn = await cachedHelper.promise;
    console.log(`MongoDB Connected: ${cachedHelper.conn.connection.host}`);
  } catch (e) {
    cachedHelper.promise = null;
    throw e;
  }

  return cachedHelper.conn;
};

export default connectDB;
