import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import Address from '@/models/Address';
import { auth } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validations';
import { sanitize } from '@/lib/sanitize';
import { getRazorpay } from '@/lib/razorpay';
import { generateOrderId, calculateShippingFee } from '@/lib/utils';
import { calculateGST } from '@/lib/gst';
import { checkServiceability, calculateShippingCost } from '@/lib/delhivery';

// POST /api/checkout/create-order — Create order with atomic variant-level stock reservation
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = sanitize(await req.json());
    const parsed = createOrderSchema.parse(body);

    // 1. Get shipping address
    const address = await Address.findOne({
      _id: parsed.addressId,
      userId: session.user.id,
    }).lean();
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // 1b. Check Delhivery serviceability BEFORE proceeding
    const serviceability = await checkServiceability(address.pincode as string);
    if (!serviceability.serviceable) {
      return NextResponse.json(
        { error: `Delivery is not available for pincode ${address.pincode}. Please use a different address.` },
        { status: 400 }
      );
    }

    // 2. Get cart items (or buy-now item)
    // Each item has: productId (MongoDB _id), variantId, quantity
    let cartItems: { productId: string; variantId: string; quantity: number }[];

    if (parsed.isBuyNow && parsed.buyNowItem) {
      // buyNowItem.productId is the MongoDB _id (NOT human-readable "CPS001")
      cartItems = [{
        productId: parsed.buyNowItem.productId,
        variantId: parsed.buyNowItem.variantId,
        quantity: parsed.buyNowItem.quantity,
      }];
    } else {
      const cart = await Cart.findOne({ userId: session.user.id });
      if (!cart || cart.items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cartItems = cart.items.map((item: any) => ({
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        quantity: item.quantity,
      }));
    }

    // 3. Validate products/variants and build order items with snapshots
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cartItems) {
      // productId here is the MongoDB _id
      const productDoc = await Product.findById(cartItem.productId);
      if (!productDoc || !productDoc.isActive) {
        return NextResponse.json({ error: `Product not found: ${cartItem.productId}` }, { status: 400 });
      }

      // Find the specific variant within the product
      const variant = productDoc.variants.id(cartItem.variantId);
      if (!variant) {
        return NextResponse.json({
          error: `Variant ${cartItem.variantId} not found in product ${productDoc.title}`,
        }, { status: 400 });
      }

      // Snapshot captures variant-level data at time of purchase
      orderItems.push({
        productId: productDoc._id,
        variantId: new mongoose.Types.ObjectId(cartItem.variantId),
        productSnapshot: {
          title: productDoc.title,
          image: productDoc.images[0] || '',
          price: variant.price,
          packagingSize: variant.packagingSize,
          productId: productDoc.productId, // human-readable "CPS001" for display
          weight: variant.weight,
          hsnCode: productDoc.hsnCode || '',
        },
        quantity: cartItem.quantity,
        priceAtOrder: variant.price,
      });
      subtotal += variant.price * cartItem.quantity;
    }

    // 4. ATOMIC stock reservation using $inc with arrayFilters
    // The $gte guard in the arrayFilter ensures atomicity: if the variant's stock
    // is less than requested quantity, the filter won't match and modifiedCount = 0.
    // MongoDB guarantees document-level atomicity, so concurrent orders on the
    // same variant cannot both succeed when stock is insufficient.
    for (let i = 0; i < cartItems.length; i++) {
      const cartItem = cartItems[i];
      const variantOid = new mongoose.Types.ObjectId(cartItem.variantId);

      const result = await Product.updateOne(
        { _id: cartItem.productId },
        { $inc: { 'variants.$[v].stock': -cartItem.quantity } },
        { arrayFilters: [{ 'v._id': variantOid, 'v.stock': { $gte: cartItem.quantity } }] }
      );

      if (result.modifiedCount === 0) {
        // Rollback previously reserved stock for items 0..i-1
        for (let j = 0; j < i; j++) {
          const rollbackOid = new mongoose.Types.ObjectId(cartItems[j].variantId);
          await Product.updateOne(
            { _id: cartItems[j].productId },
            { $inc: { 'variants.$[v].stock': cartItems[j].quantity } },
            { arrayFilters: [{ 'v._id': rollbackOid }] }
          );
        }

        // Look up current stock for the error message
        const productDoc = await Product.findById(cartItem.productId);
        const variant = productDoc?.variants.id(cartItem.variantId);
        return NextResponse.json({
          error: `Insufficient stock for ${productDoc?.title || 'product'} (${variant?.packagingSize || '?'}). Available: ${variant?.stock || 0}`,
        }, { status: 400 });
      }
    }

    // 5. Handle coupon reservation
    let discount = 0;
    let couponData = undefined;

    if (parsed.couponCode) {
      const coupon = await Coupon.findOne({ code: parsed.couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        // Reserve coupon slot atomically
        const couponResult = await Coupon.updateOne(
          {
            _id: coupon._id,
            $expr: { $lt: [{ $add: ['$usedCount', '$reservedCount'] }, '$usageLimit'] },
          },
          { $inc: { reservedCount: 1 } }
        );

        if (couponResult.modifiedCount > 0) {
          if (coupon.discountType === 'percentage') {
            discount = Math.round((subtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
              discount = coupon.maxDiscountAmount;
            }
          } else {
            discount = coupon.discountValue;
          }
          discount = Math.min(discount, subtotal);

          await CouponUsage.create({
            couponId: coupon._id,
            userId: session.user.id,
            status: 'reserved',
          });

          couponData = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
          };
        }
      }
    }

    // 6. Calculate shipping cost (Delhivery dynamic quote, with flat-rate fallback)
    const totalWeightGrams = orderItems.reduce(
      (sum, item) => sum + (item.productSnapshot.weight || 0) * item.quantity, 0
    );

    let shippingFee: number;
    let shippingQuoteData = undefined;
    const billingMode = (process.env.DELHIVERY_BILLING_MODE || 'S') as 'E' | 'S';

    try {
      const quote = await calculateShippingCost({
        originPincode: process.env.DELHIVERY_WAREHOUSE_PINCODE!,
        destPincode: address.pincode as string,
        chargeableWeightGrams: Math.max(totalWeightGrams, 1),
        billingMode,
      });
      shippingFee = quote.amount;
      shippingQuoteData = {
        amount: quote.amount,
        isApproximate: true,
        weightGrams: totalWeightGrams,
        billingMode,
        calculatedAt: new Date(),
      };
    } catch (error) {
      console.error('[DELHIVERY] Shipping quote failed, using fallback:', error);
      shippingFee = calculateShippingFee(subtotal - discount);
    }

    const total = subtotal - discount + shippingFee;

    // 6b. Calculate GST breakdown from the subtotal (prices are GST-inclusive)
    const gst = calculateGST(subtotal, address.state as string);

    // 7. Create Razorpay order
    const razorpayOrder = await getRazorpay().orders.create({
      amount: total,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    });

    // 8. Generate order ID
    const orderId = await generateOrderId(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Order.countDocuments({ createdAt: { $gte: today } });
    });

    // 9. Create Order document
    const order = await Order.create({
      orderId,
      userId: session.user.id,
      items: orderItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      pricing: {
        subtotal,
        discount,
        shippingFee,
        total,
        gst: {
          basePrice: gst.basePrice,
          cgst: gst.cgst,
          sgst: gst.sgst,
          isIntraState: gst.isIntraState,
        },
      },
      coupon: couponData,
      payment: {
        razorpayOrderId: razorpayOrder.id,
        status: 'pending',
      },
      paymentProcessed: false,
      stockReleased: false,
      status: 'placed',
      isBuyNow: parsed.isBuyNow || false,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      notes: parsed.notes || '',
      shippingQuote: shippingQuoteData,
    });

    // 10. Clear cart (if not buy-now)
    if (!parsed.isBuyNow) {
      await Cart.findOneAndUpdate({ userId: session.user.id }, { $set: { items: [] } });
    }

    return NextResponse.json({
      orderId: order.orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: total,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('POST /api/checkout/create-order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
