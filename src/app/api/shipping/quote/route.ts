import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { auth } from '@/lib/auth';
import { checkServiceability, calculateShippingCost } from '@/lib/delhivery';
import { calculateShippingFee } from '@/lib/utils';

// ---------------------------------------------------------------------------
// In-memory cache for shipping quotes (1 hour TTL)
// Key: "pincode:weightBucket:mode"
// ---------------------------------------------------------------------------

const quoteCache = new Map<
  string,
  { data: QuoteResponse; expiresAt: number }
>();
const QUOTE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface QuoteResponse {
  shippingCost: number; // paisa
  serviceable: boolean;
  isApproximate: boolean;
  isFallback: boolean;
}

function getCacheKey(pincode: string, weightGrams: number, mode: string): string {
  const bucket = Math.ceil(weightGrams / 100) * 100; // 100g buckets
  return `${pincode}:${bucket}:${mode}`;
}

// ---------------------------------------------------------------------------
// GET /api/shipping/quote?destPincode=XXXXXX
// Optionally: &buyNowProductId=X&buyNowQuantity=N
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const destPincode = searchParams.get('destPincode');
    if (!destPincode || !/^\d{6}$/.test(destPincode)) {
      return NextResponse.json(
        { error: 'Valid 6-digit destination pincode is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Compute total weight from DB — never trust client-supplied weight
    const buyNowProductId = searchParams.get('buyNowProductId');
    const buyNowQuantity = parseInt(searchParams.get('buyNowQuantity') || '1', 10);

    let totalWeightGrams = 0;

    if (buyNowProductId) {
      // Buy-now mode
      const product = await Product.findById(buyNowProductId).select('weight').lean();
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      totalWeightGrams = (product.weight || 0) * buyNowQuantity;
    } else {
      // Cart mode
      const cart = await Cart.findOne({ userId: session.user.id });
      if (!cart || cart.items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productIds = cart.items.map((item: any) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } })
        .select('weight')
        .lean();

      const weightMap = new Map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products.map((p: any) => [p._id.toString(), p.weight || 0])
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of cart.items as any[]) {
        const weight = weightMap.get(item.productId.toString()) || 0;
        totalWeightGrams += weight * item.quantity;
      }
    }

    totalWeightGrams = Math.max(totalWeightGrams, 1); // At least 1g

    const billingMode = (process.env.DELHIVERY_BILLING_MODE || 'S') as 'E' | 'S';
    const cacheKey = getCacheKey(destPincode, totalWeightGrams, billingMode);

    // Check cache
    const cached = quoteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Check serviceability first (fail fast)
    const serviceability = await checkServiceability(destPincode);
    if (!serviceability.serviceable) {
      const result: QuoteResponse = {
        shippingCost: 0,
        serviceable: false,
        isApproximate: false,
        isFallback: false,
      };
      quoteCache.set(cacheKey, { data: result, expiresAt: Date.now() + QUOTE_CACHE_TTL });
      return NextResponse.json(result);
    }

    // Calculate shipping cost via Delhivery Invoice API
    let result: QuoteResponse;
    try {
      const quote = await calculateShippingCost({
        originPincode: process.env.DELHIVERY_WAREHOUSE_PINCODE!,
        destPincode,
        chargeableWeightGrams: totalWeightGrams,
        billingMode,
      });

      result = {
        shippingCost: quote.amount,
        serviceable: true,
        isApproximate: true,
        isFallback: false,
      };
    } catch (error) {
      // Fallback to flat-rate if Delhivery API is down
      console.error('[SHIPPING QUOTE] Delhivery API failed, using fallback:', error);
      // Use subtotal=0 as we don't have it here; flat-rate logic returns ₹49
      const fallbackFee = calculateShippingFee(0);
      result = {
        shippingCost: fallbackFee,
        serviceable: true,
        isApproximate: false,
        isFallback: true,
      };
    }

    // Cache result
    quoteCache.set(cacheKey, { data: result, expiresAt: Date.now() + QUOTE_CACHE_TTL });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/shipping/quote error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate shipping cost' },
      { status: 500 }
    );
  }
}
