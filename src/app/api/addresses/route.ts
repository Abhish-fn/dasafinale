import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Address from '@/models/Address';
import { auth } from '@/lib/auth';
import { addressSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';

// GET /api/addresses — Get user's saved addresses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const addresses = await Address.find({ userId: session.user.id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('GET /api/addresses error:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

// POST /api/addresses — Create new address
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = sanitize(await req.json());
    const parsed = addressSchema.parse(body);

    // If setting as default, unset other defaults
    if (parsed.isDefault) {
      await Address.updateMany(
        { userId: session.user.id },
        { $set: { isDefault: false } }
      );
    }

    // If first address, make it default
    const count = await Address.countDocuments({ userId: session.user.id });
    if (count === 0) parsed.isDefault = true;

    const address = await Address.create({
      ...parsed,
      userId: session.user.id,
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((e) => {
        fieldErrors[e.path.join('.')] = e.message;
      });
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors },
        { status: 400 }
      );
    }
    console.error('POST /api/addresses error:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}
