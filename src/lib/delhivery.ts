/**
 * Delhivery API Client
 *
 * Central server-side client for all Delhivery shipping operations.
 * All configuration is read from environment variables — nothing hardcoded.
 *
 * Methods:
 *  - checkServiceability(pincode)     → Is this pincode deliverable?
 *  - calculateShippingCost(params)    → Invoice API shipping quote
 *  - createShipment(order)            → Create shipment, get waybill
 *  - requestPickup(warehouse, count)  → Schedule pickup
 *  - trackShipment(waybill)           → Live tracking data
 *  - cancelShipment(waybill)          → Cancel/RTO
 *  - createAndAssignShipment(orderId) → Idempotent orchestrator
 */

import dbConnect from '@/lib/db';
import Order, { type IOrder } from '@/models/Order';

// ---------------------------------------------------------------------------
// Config — single source of truth, all from env vars
// ---------------------------------------------------------------------------

function getConfig() {
  return {
    baseUrl: process.env.DELHIVERY_BASE_URL || 'https://staging-express.delhivery.com',
    token: process.env.DELHIVERY_API_TOKEN || '',
    warehouseName: process.env.DELHIVERY_WAREHOUSE_NAME || '',
    warehousePincode: process.env.DELHIVERY_WAREHOUSE_PINCODE || '',
    clientName: process.env.DELHIVERY_CLIENT_NAME || '',
    sellerGstTin: process.env.DELHIVERY_SELLER_GST_TIN || '',
    billingMode: (process.env.DELHIVERY_BILLING_MODE || 'S') as 'E' | 'S',
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceabilityResult {
  serviceable: boolean;
  prepaid: boolean;
  cod: boolean;
}

export interface ShippingQuoteParams {
  originPincode: string;
  destPincode: string;
  chargeableWeightGrams: number;
  billingMode: 'E' | 'S';
}

export interface ShippingQuote {
  amount: number; // in paisa
  isApproximate: true;
  chargeableWeight: number;
  billingMode: string;
}

export interface ShipmentResult {
  waybill: string;
  shipmentId: string;
  refId: string;
  success: boolean;
  remarks: string;
}

export interface TrackingScan {
  status: string;
  statusDateTime: string;
  location: string;
  instructions: string;
}

export interface TrackingResult {
  status: string;
  scans: TrackingScan[];
  expectedDelivery: string | null;
  currentLocation: string | null;
  waybill: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sanitize strings for Delhivery — they reject & # % ; \ */
function sanitizeForDelhivery(str: string): string {
  return str.replace(/[&#%;\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Make authenticated request to Delhivery.
 * Uses Authorization: Token xxx header for all endpoints.
 */
async function delhiveryFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getConfig();
  const url = `${config.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Token ${config.token}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  return fetch(url, { ...options, headers });
}

// ---------------------------------------------------------------------------
// 1. Pincode Serviceability
// ---------------------------------------------------------------------------

export async function checkServiceability(
  pincode: string
): Promise<ServiceabilityResult> {
  try {
    const res = await delhiveryFetch(
      `/c/api/pin-codes/json/?filter_codes=${pincode}`
    );

    if (!res.ok) {
      console.error(`[DELHIVERY] Serviceability check failed: ${res.status}`);
      // Fail open — don't block checkout if API is down
      return { serviceable: true, prepaid: true, cod: false };
    }

    const data = await res.json();
    const deliveryCodes = data?.delivery_codes;

    if (!deliveryCodes || !Array.isArray(deliveryCodes) || deliveryCodes.length === 0) {
      return { serviceable: false, prepaid: false, cod: false };
    }

    const info = deliveryCodes[0]?.postal_code;
    return {
      serviceable: true,
      prepaid: info?.pre_paid === 'Y',
      cod: info?.cod === 'Y',
    };
  } catch (error) {
    console.error('[DELHIVERY] Serviceability check error:', error);
    // Fail open
    return { serviceable: true, prepaid: true, cod: false };
  }
}

// ---------------------------------------------------------------------------
// 2. Shipping Cost (Invoice API)
// ---------------------------------------------------------------------------

export async function calculateShippingCost(
  params: ShippingQuoteParams
): Promise<ShippingQuote> {
  const config = getConfig();

  const query = new URLSearchParams({
    cl: config.clientName,
    ss: 'Delivered',
    md: params.billingMode,
    pt: 'Pre-paid',
    d_pin: params.destPincode,
    o_pin: params.originPincode,
    cgm: String(params.chargeableWeightGrams),
  });

  const res = await delhiveryFetch(
    `/api/kinko/v1/invoice/charges/.json?${query}`
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Delhivery Invoice API failed: ${res.status} ${text}`
    );
  }

  const data = await res.json();

  // Response is an array; first element has the charges
  const charges = Array.isArray(data) ? data[0] : data;

  if (!charges || charges.total_amount === undefined) {
    throw new Error('Delhivery Invoice API returned unexpected response');
  }

  // Minimum shipping floor — staging returns ₹0 (no rate cards).
  // Production rates are always higher, so this only kicks in on staging.
  const MINIMUM_SHIPPING_PAISA = 4900; // ₹49
  const calculatedAmount = Math.round(charges.total_amount * 100);
  const amount = Math.max(calculatedAmount, MINIMUM_SHIPPING_PAISA);

  return {
    amount,
    isApproximate: true,
    chargeableWeight: charges.charged_weight || params.chargeableWeightGrams,
    billingMode: params.billingMode,
  };
}

// ---------------------------------------------------------------------------
// 3. Create Shipment
// ---------------------------------------------------------------------------

export async function createShipment(order: IOrder): Promise<ShipmentResult> {
  const config = getConfig();

  const address = [
    sanitizeForDelhivery(order.shippingAddress.addressLine1),
    order.shippingAddress.addressLine2
      ? sanitizeForDelhivery(order.shippingAddress.addressLine2)
      : '',
  ]
    .filter(Boolean)
    .join(', ');

  const totalWeight = order.items.reduce(
    (sum, item) => sum + (item.productSnapshot.weight || 0) * item.quantity,
    0
  );

  const hsnCodes = order.items
    .map((item) => item.productSnapshot.hsnCode)
    .filter(Boolean)
    .join(',');

  const shipment = {
    name: sanitizeForDelhivery(order.shippingAddress.fullName),
    add: address,
    pin: order.shippingAddress.pincode,
    city: sanitizeForDelhivery(order.shippingAddress.city),
    state: order.shippingAddress.state,
    country: 'India',
    phone: order.shippingAddress.phone,
    order: order.orderId,
    payment_mode: 'Prepaid',
    total_amount: order.pricing.total / 100, // paisa → rupees
    cod_amount: '0',
    weight: totalWeight,
    seller_gst_tin: config.sellerGstTin,
    hsn_code: hsnCodes,
    shipment_width: 0,
    shipment_height: 0,
    shipment_length: 0,
    return_name: config.warehouseName,
    return_pin: config.warehousePincode,
  };

  const payload = {
    shipments: [shipment],
    pickup_location: { name: config.warehouseName },
  };

  const params = new URLSearchParams();
  params.append('format', 'json');
  params.append('data', JSON.stringify(payload));

  const res = await delhiveryFetch('/api/cmu/create.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Delhivery Create Shipment failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (!data.success || !data.packages?.[0]) {
    const remarks = data.packages?.[0]?.remarks?.join(', ') || data.rmk || 'Unknown error';
    throw new Error(`Delhivery shipment creation rejected: ${remarks}`);
  }

  const pkg = data.packages[0];
  return {
    waybill: pkg.waybill,
    shipmentId: pkg.sort_code || '',
    refId: pkg.refnum || order.orderId,
    success: true,
    remarks: pkg.remarks?.join(', ') || '',
  };
}

// ---------------------------------------------------------------------------
// 4. Request Pickup
// ---------------------------------------------------------------------------

export async function requestPickup(
  warehouseName: string,
  expectedPackages: number
): Promise<boolean> {
  try {
    const now = new Date();
    const pickupDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next day
    const dateStr = pickupDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const body = JSON.stringify({
      pickup_time: '12:00:00',
      pickup_date: dateStr,
      pickup_location: warehouseName,
      expected_package_count: expectedPackages,
    });

    const res = await delhiveryFetch('/fm/request/new/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[DELHIVERY] Pickup request failed: ${res.status} ${text}`);
      return false;
    }

    console.log('[DELHIVERY] Pickup scheduled for', dateStr);
    return true;
  } catch (error) {
    console.error('[DELHIVERY] Pickup request error:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 5. Track Shipment
// ---------------------------------------------------------------------------

export async function trackShipment(waybill: string): Promise<TrackingResult> {
  const res = await delhiveryFetch(
    `/api/v1/packages/json/?waybill=${waybill}&verbose=2`
  );

  if (!res.ok) {
    throw new Error(`Delhivery Tracking API failed: ${res.status}`);
  }

  const data = await res.json();
  const shipment = data?.ShipmentData?.[0]?.Shipment;

  if (!shipment) {
    throw new Error('Shipment not found in tracking response');
  }

  const scans: TrackingScan[] = (shipment.Scans || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scan: any) => ({
      status: scan.ScanDetail?.Scan || scan.ScanDetail?.StatusCode || '',
      statusDateTime: scan.ScanDetail?.ScanDateTime || '',
      location: scan.ScanDetail?.ScannedLocation || '',
      instructions: scan.ScanDetail?.Instructions || '',
    })
  );

  return {
    status: shipment.Status?.Status || '',
    scans,
    expectedDelivery: shipment.ExpectedDeliveryDate || null,
    currentLocation:
      shipment.Status?.StatusLocation || scans[0]?.location || null,
    waybill,
  };
}

// ---------------------------------------------------------------------------
// 6. Cancel Shipment
// ---------------------------------------------------------------------------

export async function cancelShipment(waybill: string): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.append('waybill', waybill);
    params.append('cancellation', 'true');

    const res = await delhiveryFetch('/api/p/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    return res.ok;
  } catch (error) {
    console.error('[DELHIVERY] Cancel shipment error:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 7. Idempotent Shipment Orchestrator
// ---------------------------------------------------------------------------

/**
 * Create a Delhivery shipment for an order.
 *
 * Idempotency: Uses atomic findOneAndUpdate with a PENDING sentinel.
 * If two callers race (verify-payment + Razorpay webhook), only one wins.
 * If the API call fails, PENDING is cleared so the retry cron picks it up.
 */
export async function createAndAssignShipment(orderId: string): Promise<void> {
  await dbConnect();

  // ATOMIC: Only claim orders without a waybill
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      'payment.status': 'paid',
      'tracking.waybill': { $exists: false },
    },
    { $set: { 'tracking.waybill': 'PENDING' } },
    { returnDocument: 'after' }
  );

  if (!order) {
    // Already has waybill, or not eligible (not paid, etc.)
    console.log(
      `[DELHIVERY] Skipping order ${orderId} — already has waybill or not eligible`
    );
    return;
  }

  try {
    const result = await createShipment(order);

    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          'tracking.waybill': result.waybill,
          'tracking.carrier': 'Delhivery',
          'tracking.trackingUrl': `https://www.delhivery.com/track/package/${result.waybill}`,
          'tracking.shipmentCreatedAt': new Date(),
          'delhivery.shipmentId': result.shipmentId,
          'delhivery.refId': result.refId,
          'delhivery.lastSyncAt': new Date(),
        },
        $push: {
          'tracking.statusHistory': {
            status: 'shipment_created',
            timestamp: new Date(),
            note: `Delhivery waybill: ${result.waybill}`,
          },
        },
      }
    );

    // Schedule pickup (non-blocking)
    const config = getConfig();
    requestPickup(config.warehouseName, 1).catch(console.error);

    console.log(
      `[DELHIVERY] Shipment created for order ${orderId}: waybill ${result.waybill}`
    );
  } catch (error) {
    // Release PENDING sentinel so retry cron can pick it up
    await Order.updateOne(
      { _id: orderId, 'tracking.waybill': 'PENDING' },
      { $unset: { 'tracking.waybill': 1 } }
    );
    console.error(`[DELHIVERY] Shipment failed for order ${orderId}:`, error);
  }
}
