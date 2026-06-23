/**
 * Unit tests for GET /api/orders/[orderId]/track
 *
 * These tests verify the most critical production behavior:
 * graceful degradation when Delhivery is unreachable.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock auth — returns a session by default
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));

// Mock dbConnect
vi.mock('@/lib/db', () => ({ default: vi.fn() }));

// Mock rateLimit — allows by default
const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

// Mock Order model
const mockFindOne = vi.fn();
vi.mock('@/models/Order', () => ({
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

// Mock trackShipment
const mockTrackShipment = vi.fn();
vi.mock('@/lib/delhivery', () => ({
  trackShipment: (...args: unknown[]) => mockTrackShipment(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): Request {
  return new Request('http://localhost/api/orders/DD-220626-001/track');
}

function makeCtx(orderId = 'DD-220626-001') {
  return { params: Promise.resolve({ orderId }) };
}

function mockSession(userId = 'user123', role = 'user') {
  return { user: { id: userId, role } };
}

function mockOrder(overrides = {}) {
  return {
    status: 'shipped',
    tracking: {
      waybill: 'WB123456',
      statusHistory: [
        { status: 'confirmed', timestamp: new Date().toISOString(), note: 'Order confirmed' },
        { status: 'shipped', timestamp: new Date().toISOString(), note: 'Handed to Delhivery' },
      ],
    },
    ...overrides,
  };
}

function mockTrackingResult() {
  return {
    status: 'In Transit',
    scans: [
      { status: 'In Transit', statusDateTime: new Date().toISOString(), location: 'Vijayawada Hub', instructions: '' },
    ],
    expectedDelivery: new Date(Date.now() + 86400000).toISOString(),
    currentLocation: 'Vijayawada Hub',
    waybill: 'WB123456',
  };
}

// ---------------------------------------------------------------------------
// Import the route handler (after mocks are set up)
// ---------------------------------------------------------------------------

// We need to import after mocks
let GET: typeof import('./route').GET;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  // Default mock behaviors
  mockAuth.mockResolvedValue(mockSession());
  mockRateLimit.mockReturnValue({ success: true, remaining: 19 });
  mockFindOne.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockOrder()),
    }),
  });
  mockTrackShipment.mockResolvedValue(mockTrackingResult());

  // Re-import to get fresh module
  const mod = await import('../route');
  GET = mod.GET;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/orders/[orderId]/track', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest() as never, makeCtx() as never);
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ success: false, remaining: 0 });
    const res = await GET(makeRequest() as never, makeCtx() as never);
    expect(res.status).toBe(429);
  });

  it('returns 404 for non-owned order', async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });
    const res = await GET(makeRequest() as never, makeCtx() as never);
    expect(res.status).toBe(404);
  });

  it('returns fallback for PENDING waybill without calling Delhivery', async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrder({
          tracking: { waybill: 'PENDING', statusHistory: [{ status: 'placed', timestamp: new Date() }] },
        })),
      }),
    });

    const res = await GET(makeRequest() as never, makeCtx() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tracking).toBeNull();
    expect(body.fallback).toHaveLength(1);
    expect(body.degraded).toBeUndefined();
    expect(mockTrackShipment).not.toHaveBeenCalled();
  });

  it('returns live tracking when Delhivery succeeds', async () => {
    const res = await GET(makeRequest() as never, makeCtx() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tracking).not.toBeNull();
    expect(body.tracking.waybill).toBe('WB123456');
    expect(body.fallback).toHaveLength(0);
    expect(body.degraded).toBeUndefined();
  });

  it('returns fallback with degraded=true when Delhivery times out', async () => {
    mockTrackShipment.mockRejectedValue(new Error('Delhivery Tracking API failed: 504'));

    const res = await GET(makeRequest() as never, makeCtx() as never);
    const body = await res.json();

    expect(res.status).toBe(200); // NOT 500!
    expect(body.tracking).toBeNull();
    expect(body.fallback).toHaveLength(2); // DB statusHistory
    expect(body.degraded).toBe(true);
    expect(body.status).toBe('shipped');
  });

  it('returns fallback with degraded=true when Delhivery returns malformed data', async () => {
    mockTrackShipment.mockRejectedValue(new Error('Shipment not found in tracking response'));

    const res = await GET(makeRequest() as never, makeCtx() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tracking).toBeNull();
    expect(body.degraded).toBe(true);
    expect(body.fallback.length).toBeGreaterThan(0);
  });

  it('allows admin to track any order', async () => {
    mockAuth.mockResolvedValue(mockSession('admin123', 'admin'));

    await GET(makeRequest() as never, makeCtx() as never);

    // Admin query should NOT include userId
    const queryArg = mockFindOne.mock.calls[0][0];
    expect(queryArg).toEqual({ orderId: 'DD-220626-001' });
    expect(queryArg.userId).toBeUndefined();
  });

  it('restricts user to their own orders', async () => {
    await GET(makeRequest() as never, makeCtx() as never);

    const queryArg = mockFindOne.mock.calls[0][0];
    expect(queryArg).toEqual({ orderId: 'DD-220626-001', userId: 'user123' });
  });
});
