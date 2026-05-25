import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Address from '@/models/Address';
import { auth } from '@/lib/auth';
import { addressSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';

// PUT /api/addresses/[addressId] — Update address
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ addressId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { addressId } = await ctx.params;
    const body = sanitize(await req.json());
    const parsed = addressSchema.partial().parse(body);

    // If setting as default, unset other defaults
    if (parsed.isDefault) {
      await Address.updateMany(
        { userId: session.user.id, _id: { $ne: addressId } },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId: session.user.id },
      { $set: parsed },
      { new: true }
    );

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error('PUT /api/addresses/[addressId] error:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

// DELETE /api/addresses/[addressId]
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ addressId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { addressId } = await ctx.params;

    const result = await Address.findOneAndDelete({
      _id: addressId,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Address deleted' });
  } catch (error) {
    console.error('DELETE /api/addresses/[addressId] error:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
