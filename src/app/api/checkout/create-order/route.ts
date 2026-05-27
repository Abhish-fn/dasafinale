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

// POST /api/checkout/create-order — Create order with atomic stock reservation
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

    // 2. Get cart items (or buy-now item)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cartItems: { productId: string; quantity: number }[];

    if (parsed.isBuyNow && parsed.buyNowItem) {
      cartItems = [{ productId: parsed.buyNowItem.productId, quantity: parsed.buyNowItem.quantity }];
    } else {
      const cart = await Cart.findOne({ userId: session.user.id });
      if (!cart || cart.items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cartItems = cart.items.map((item: any) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
      }));
    }

    // 3. Validate products and build order items
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of cartItems) {
      const product = await Product.findById(cartItem.productId);
      if (!product || !product.isActive) {
        return NextResponse.json({ error: `Product not found: ${cartItem.productId}` }, { status: 400 });
      }

      orderItems.push({
        productId: new mongoose.Types.ObjectId(cartItem.productId),
        productSnapshot: {
          title: product.title,
          image: product.images[0] || '',
          price: product.price,
          packagingSize: product.packagingSize,
          productId: product.productId,
        },
        quantity: cartItem.quantity,
        priceAtOrder: product.price,
      });
      subtotal += product.price * cartItem.quantity;
    }

    // 4. ATOMIC stock reservation using $inc with $gte floor check
    for (let i = 0; i < cartItems.length; i++) {
      const cartItem = cartItems[i];
      const result = await Product.updateOne(
        { _id: cartItem.productId, stock: { $gte: cartItem.quantity } },
        { $inc: { stock: -cartItem.quantity } }
      );
      if (result.modifiedCount === 0) {
        // Rollback previously reserved stock
        for (let j = 0; j < i; j++) {
          await Product.updateOne(
            { _id: cartItems[j].productId },
            { $inc: { stock: cartItems[j].quantity } }
          );
        }
        const product = await Product.findById(cartItem.productId).select('title stock');
        return NextResponse.json({
          error: `Insufficient stock for ${product?.title || 'product'}. Available: ${product?.stock || 0}`,
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

    // 6. Calculate pricing
    const shippingFee = calculateShippingFee(subtotal - discount);
    const total = subtotal - discount + shippingFee;

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
      pricing: { subtotal, discount, shippingFee, total },
      coupon: couponData,
      payment: {
        razorpayOrderId: razorpayOrder.id,
        status: 'pending',
      },
      paymentProcessed: false,
      status: 'placed',
      isBuyNow: parsed.isBuyNow || false,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      notes: parsed.notes || '',
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
