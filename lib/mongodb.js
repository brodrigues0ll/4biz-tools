import mongoose from "mongoose";

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/create-ticket";

const cached = global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(URI, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
