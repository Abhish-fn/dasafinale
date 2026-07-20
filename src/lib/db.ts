import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cached: MongooseCache = (global as typeof globalThis & { mongoose: MongooseCache }).mongoose || {
  conn: null,
  promise: null,
};

if (!(global as typeof globalThis & { mongoose: MongooseCache }).mongoose) {
  (global as typeof globalThis & { mongoose: MongooseCache }).mongoose = cached;
}

export default async function dbConnect(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Fail fast when Atlas is unreachable (e.g. build machine IP not whitelisted).
      // Each server component has a try/catch that returns static fallback data on
      // connection failure, so the build succeeds. Runtime connections from whitelisted
      // server IPs succeed normally and ISR populates real data on first request.
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
