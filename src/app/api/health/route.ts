import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export async function GET() {
  try {
    await dbConnect();
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    if (dbState !== 1) {
      return NextResponse.json(
        { status: 'degraded', db: dbStatus, timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      db: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'disconnected', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
