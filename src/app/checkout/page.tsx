'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/utils';
import { calculateGST } from '@/lib/gst';
import { INDIAN_STATES } from '@/lib/indianStates';
import styles from './checkout.module.css';

interface Address {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface CouponInfo {
  code: string;
  discount: number;
  description?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface BuyNowVariant {
  _id: string;
  packagingSize: string;
  price: number;
  stock: number;
  weight: number;
}

interface BuyNowProduct {
  _id: string;        // MongoDB ObjectId
  productId: string;  // human-readable "CPS001"
  title: string;
  images: string[];
  variants: BuyNowVariant[];
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const { items, total, refreshCart, swapVariant } = useCart();
  const { toast } = useToast();

  // Buy Now params
  const isBuyNow = searchParams.get('buyNow') === 'true';
  // productId here is the MongoDB _id (passed from product detail page)
  const buyNowProductMongoId = searchParams.get('productId') || '';
  const buyNowVariantId = searchParams.get('variantId') || '';
  const buyNowQuantity = parseInt(searchParams.get('quantity') || '1', 10);
  const [buyNowProduct, setBuyNowProduct] = useState<BuyNowProduct | null>(null);
  const [loadingBuyNow, setLoadingBuyNow] = useState(isBuyNow);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Address form state
  const [form, setForm] = useState({
    label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '', isDefault: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeValid, setPincodeValid] = useState(false);
  const pincodeAbortRef = useRef<AbortController | null>(null);

  // Shipping quote state
  const [shippingQuote, setShippingQuote] = useState<{
    shippingCost: number;
    serviceable: boolean;
    isApproximate: boolean;
    loading: boolean;
    error: string | null;
  }>({ shippingCost: 0, serviceable: true, isApproximate: false, loading: false, error: null });

  // Pack-size variant switching state (for cart items on checkout page)
  const [swapping, setSwapping] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  // Fetch buy-now product
  useEffect(() => {
    if (!isBuyNow || !buyNowProductMongoId) return;
    async function fetchBuyNowProduct() {
      try {
        // Fetch by MongoDB _id — the product detail API supports both slug and _id lookup
        const res = await fetch(`/api/products/${buyNowProductMongoId}`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setBuyNowProduct(data.product);
      } catch {
        toast('Could not load product. Redirecting to cart.', 'error');
        router.push('/cart');
      } finally {
        setLoadingBuyNow(false);
      }
    }
    fetchBuyNowProduct();
  }, [isBuyNow, buyNowProductMongoId, router, toast]);

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/addresses');
      const data = await res.json();
      setAddresses(data.addresses || []);
      const defaultAddr = (data.addresses || []).find((a: Address) => a.isDefault);
      if (defaultAddr) setSelectedAddress(defaultAddr._id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  // Fetch shipping quote when address changes
  const selectedAddr = addresses.find((a) => a._id === selectedAddress);
  useEffect(() => {
    if (!selectedAddr) return;

    setShippingQuote(prev => ({ ...prev, loading: true, error: null }));

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ destPincode: selectedAddr.pincode });
        if (isBuyNow && buyNowProduct) {
          params.set('buyNowProductId', buyNowProduct._id);
          params.set('buyNowVariantId', buyNowVariantId);
          params.set('buyNowQuantity', String(buyNowQuantity));
        }
        const res = await fetch(`/api/shipping/quote?${params}`);
        const data = await res.json();

        if (!res.ok) {
          setShippingQuote({ shippingCost: 0, serviceable: true, isApproximate: false, loading: false, error: data.error || 'Quote failed' });
          return;
        }

        if (!data.serviceable) {
          setShippingQuote({ shippingCost: 0, serviceable: false, isApproximate: false, loading: false, error: null });
          return;
        }

        setShippingQuote({
          shippingCost: data.shippingCost,
          serviceable: true,
          isApproximate: data.isApproximate || false,
          loading: false,
          error: null,
        });
      } catch {
        setShippingQuote(prev => ({ ...prev, loading: false, error: 'Could not calculate shipping' }));
      }
    }, 300);

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddr?.pincode, items.length, isBuyNow, buyNowProduct?._id, buyNowVariantId, buyNowQuantity]);

  // Load Razorpay SDK
  useEffect(() => {
    if (!document.getElementById('razorpay-sdk')) {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Numeric-only input handler
  const handleNumericInput = (field: string, maxLen: number) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Clear field error on change
  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Pincode auto-fill
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: value }));
    if (formErrors.pincode) setFormErrors((prev) => ({ ...prev, pincode: '' }));
    setPincodeValid(false);

    // Abort previous request
    if (pincodeAbortRef.current) pincodeAbortRef.current.abort();

    if (value.length < 6) {
      setPincodeLoading(false);
      return;
    }

    // Fetch pincode data
    const controller = new AbortController();
    pincodeAbortRef.current = controller;
    setPincodeLoading(true);

    fetch(`/api/pincode/${value}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setForm((prev) => ({
            ...prev,
            state: data.state,
            city: data.district,
          }));
          setPincodeValid(true);
          setFormErrors((prev) => ({ ...prev, pincode: '', state: '', city: '' }));
        } else {
          setFormErrors((prev) => ({ ...prev, pincode: data.error || 'Invalid pincode' }));
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setFormErrors((prev) => ({ ...prev, pincode: 'Could not verify pincode' }));
        }
      })
      .finally(() => setPincodeLoading(false));
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.fullName || form.fullName.length < 2) errors.fullName = 'Name is required';
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) errors.phone = 'Enter valid 10-digit mobile number';
    if (!form.addressLine1 || form.addressLine1.length < 5) errors.addressLine1 = 'Address is too short';
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) errors.pincode = 'Enter valid 6-digit pincode';
    if (!form.city || form.city.length < 2) errors.city = 'City is required';
    if (!form.state) errors.state = 'Select a state';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save address
  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    try {
      const isEditing = !!editingAddressId;
      const url = isEditing ? `/api/addresses/${editingAddressId}` : '/api/addresses';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        // Surface field-level Zod errors from the API
        if (data.fieldErrors) {
          setFormErrors(data.fieldErrors);
          toast('Please fix the errors below', 'error');
        } else {
          toast(data.error || 'Failed to save address', 'error');
        }
        return;
      }

      toast(isEditing ? 'Address updated!' : 'Address saved!', 'success');
      setShowAddressForm(false);
      setEditingAddressId(null);
      setForm({ label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false });
      setFormErrors({});
      setPincodeValid(false);
      await fetchAddresses();
      setSelectedAddress(data.address._id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  const handleEditAddress = (addr: Address) => {
    setEditingAddressId(addr._id);
    setForm({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    setFormErrors({});
    setPincodeValid(true);
    setShowAddressForm(true);
  };

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, cartTotal: displayTotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error);
        return;
      }
      setCoupon({ code: data.code, discount: data.discount, description: data.description });
      toast(`Coupon applied! You save ${formatPrice(data.discount)}`, 'success');
    } catch {
      setCouponError('Failed to validate coupon');
    }
  };

  // Helper: get variant from cart item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getItemVariant = (item: any) => {
    return item.product?.variants?.find((v: any) => v._id === item.variantId);
  };

  // Resolve buy-now variant
  const buyNowVariant = isBuyNow && buyNowProduct
    ? buyNowProduct.variants?.find(v => v._id === buyNowVariantId)
    : null;

  // Pricing — use buy-now product or cart
  const displayItems = isBuyNow && buyNowProduct && buyNowVariant
    ? [{
        _id: buyNowProduct._id,
        quantity: buyNowQuantity,
        product: buyNowProduct,
        variantId: buyNowVariantId,
      }]
    : items;

  const displayTotal = isBuyNow && buyNowVariant
    ? buyNowVariant.price * buyNowQuantity
    : total;

  const discount = coupon?.discount || 0;
  const subtotalAfterDiscount = displayTotal - discount;
  const shipping = shippingQuote.shippingCost;
  const grandTotal = subtotalAfterDiscount + shipping;

  // GST breakdown — derive from selected address state
  const customerState = selectedAddr?.state || '';
  const gst = customerState ? calculateGST(displayTotal, customerState) : null;

  // Place order
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast('Please select a delivery address', 'warning');
      return;
    }
    if (!isBuyNow && items.length === 0) {
      toast('Your cart is empty', 'warning');
      return;
    }
    if (isBuyNow && (!buyNowProduct || !buyNowVariant)) {
      toast('Product not loaded', 'warning');
      return;
    }

    setProcessing(true);
    try {
      // 1. Create order
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: selectedAddress,
          couponCode: coupon?.code,
          notes,
          ...(isBuyNow ? {
            isBuyNow: true,
            buyNowItem: {
              // productId here is the MongoDB _id (from buyNowProduct._id)
              productId: buyNowProduct!._id,
              variantId: buyNowVariantId,
              quantity: buyNowQuantity,
            },
          } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      // 2. Open Razorpay modal
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'www.DasaDinusulu.com',
        description: `Order ${data.orderId}`,
        order_id: data.razorpayOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch('/api/checkout/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              await refreshCart();
              router.push(`/orders/${verifyData.orderId}?new=true`);
            } else {
              router.push(`/orders/${data.orderId}?failed=true`);
            }
          } catch {
            router.push(`/orders/${data.orderId}?failed=true`);
          }
        },
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        theme: { color: '#6b8c3e' },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast('Payment cancelled', 'warning');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setProcessing(false);
        toast('Payment failed. Please try again.', 'error');
      });
      rzp.open();
    } catch (err) {
      setProcessing(false);
      toast(err instanceof Error ? err.message : 'Failed to create order', 'error');
    }
  };

  if (authStatus === 'loading' || loadingAddresses || loadingBuyNow) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Checkout</h1>
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Checkout</h1>
      <div className={styles.layout}>
        <div>
          {/* 1. Delivery Address */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNum}>1</span> Delivery Address
            </h2>
            <div className={styles.addressGrid}>
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className={`${styles.addressCard} ${selectedAddress === addr._id ? styles.addressCardSelected : ''}`}
                  onClick={() => setSelectedAddress(addr._id)}
                >
                  <div className={styles.addressLabel}>
                    {addr.label}
                    {addr.isDefault && <span className={styles.addressDefault}>Default</span>}
                    <button
                      className={styles.addressEditBtn}
                      onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}
                      aria-label={`Edit ${addr.label} address`}
                      title="Edit address"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.addressName}>{addr.fullName}</div>
                  <div className={styles.addressText}>
                    {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                    {addr.city}, {addr.state} - {addr.pincode}
                  </div>
                  <div className={styles.addressPhone}>📱 {addr.phone}</div>
                </div>
              ))}
              <button className={styles.addAddressBtn} onClick={() => { setEditingAddressId(null); setForm({ label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false }); setFormErrors({}); setPincodeValid(false); setShowAddressForm(!showAddressForm); }}>
                + Add New Address
              </button>
            </div>

            {showAddressForm && (
              <div className={styles.formGrid} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Label</label>
                  <select className={styles.formSelect} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
                    <option>Home</option><option>Work</option><option>Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input
                    className={`${styles.formInput} ${formErrors.fullName ? styles.formInputError : ''}`}
                    value={form.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder="Full name"
                  />
                  {formErrors.fullName && <span className={styles.formError}>{formErrors.fullName}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone</label>
                  <input
                    className={`${styles.formInput} ${formErrors.phone ? styles.formInputError : ''}`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={handleNumericInput('phone', 10)}
                    placeholder="10-digit mobile"
                  />
                  {formErrors.phone && <span className={styles.formError}>{formErrors.phone}</span>}
                  <span className={styles.formHint}>Receiver&apos;s number - used only for delivery tracking.</span>
                </div>
                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.formLabel}>Address Line 1</label>
                  <input
                    className={`${styles.formInput} ${formErrors.addressLine1 ? styles.formInputError : ''}`}
                    value={form.addressLine1}
                    onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                    placeholder="House no, building, street"
                  />
                  {formErrors.addressLine1 && <span className={styles.formError}>{formErrors.addressLine1}</span>}
                </div>
                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.formLabel}>Address Line 2 (Optional)</label>
                  <input className={styles.formInput} value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} placeholder="Area, landmark" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Pincode</label>
                  <div className={styles.pincodeWrapper}>
                    <input
                      className={`${styles.formInput} ${formErrors.pincode ? styles.formInputError : ''}`}
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pincode}
                      onChange={handlePincodeChange}
                      placeholder="6-digit pincode"
                    />
                    <div className={styles.pincodeIndicator}>
                      {pincodeLoading && <div className={styles.pincodeSpinner} />}
                      {pincodeValid && !pincodeLoading && <span className={styles.pincodeSuccess}>✓</span>}
                    </div>
                  </div>
                  {formErrors.pincode && <span className={styles.formError}>{formErrors.pincode}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>City</label>
                  <input
                    className={`${styles.formInput} ${formErrors.city ? styles.formInputError : ''}`}
                    value={form.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="City"
                  />
                  {formErrors.city && <span className={styles.formError}>{formErrors.city}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>State</label>
                  <select
                    className={`${styles.formSelect} ${formErrors.state ? styles.formInputError : ''}`}
                    value={form.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {formErrors.state && <span className={styles.formError}>{formErrors.state}</span>}
                </div>
                <div className={`${styles.formActions} ${styles.formFull}`}>
                  <button className={styles.formCancel} onClick={() => { setShowAddressForm(false); setEditingAddressId(null); setFormErrors({}); setPincodeValid(false); }}>Cancel</button>
                  <button className={styles.formSave} onClick={handleSaveAddress}>{editingAddressId ? 'Update Address' : 'Save Address'}</button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Coupon */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNum}>2</span> Apply Coupon
            </h2>
            {!coupon ? (
              <>
                <div className={styles.couponRow}>
                  <input
                    className={styles.couponInput}
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <button className={styles.couponApply} onClick={handleApplyCoupon} disabled={!couponCode.trim()}>
                    Apply
                  </button>
                </div>
                {couponError && <p className={styles.couponError}>{couponError}</p>}
              </>
            ) : (
              <div className={styles.couponSuccess}>
                <span className={styles.couponSuccessText}>
                  ✅ {coupon.code} — You save {formatPrice(coupon.discount)}
                </span>
                <button className={styles.couponRemove} onClick={() => { setCoupon(null); setCouponCode(''); }}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* 3. Notes */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNum}>3</span> Order Notes (Optional)
            </h2>
            <textarea
              className={styles.notesInput}
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>
          <div className={styles.summaryItems}>
            {displayItems.map((item) => {
              const variant = isBuyNow ? buyNowVariant : getItemVariant(item);
              if (!variant) return null;

              const hasMultipleVariants = !isBuyNow && item.product.variants.length > 1;
              const sortedVariants = hasMultipleVariants
                ? [...item.product.variants].sort((a: any, b: any) => a.price - b.price)
                : [];

              return (
                <div key={item._id} className={styles.summaryItem}>
                  <div className={styles.summaryItemImage}>
                    {item.product.images?.[0] && (
                      <Image src={item.product.images[0]} alt="" fill sizes="48px" />
                    )}
                  </div>
                  <div className={styles.summaryItemInfo}>
                    <div className={styles.summaryItemName}>{item.product.title}</div>
                    <div className={styles.summaryItemMeta}>
                      {/* Inline variant pill toggle */}
                      {hasMultipleVariants && sortedVariants.length > 1 ? (
                        <span style={{ display: 'inline-flex', gap: '1px', border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginRight: 'var(--space-2)' }}>
                          {sortedVariants.map((v: any) => (
                            <button
                              key={v._id}
                              disabled={v._id === (item as any).variantId || v.stock === 0 || swapping === item._id}
                              onClick={async () => {
                                if (v._id === (item as any).variantId) return;
                                setSwapping(item._id);
                                try {
                                  await swapVariant(item._id, v._id);
                                  toast('Pack size updated!', 'success');
                                } catch (err) {
                                  toast(err instanceof Error ? err.message : 'Failed', 'error');
                                } finally {
                                  setSwapping(null);
                                }
                              }}
                              style={{
                                padding: '2px 8px', fontSize: '10px', fontWeight: 600, border: 'none',
                                background: v._id === (item as any).variantId ? 'var(--red)' : 'transparent',
                                color: v._id === (item as any).variantId ? 'white' : 'var(--color-gray-600)',
                                cursor: v._id === (item as any).variantId ? 'default' : 'pointer',
                                opacity: v.stock === 0 && v._id !== (item as any).variantId ? 0.35 : 1,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {v.packagingSize}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <span>{variant.packagingSize} </span>
                      )}
                      × {item.quantity}
                    </div>
                  </div>
                  <div className={styles.summaryItemPrice}>{formatPrice(variant.price * item.quantity)}</div>
                </div>
              );
            })}
          </div>

          <hr className={styles.summaryDivider} />
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span className={styles.summaryValue}>{formatPrice(displayTotal)}</span>
          </div>
          {gst && (
            <>
              <div className={styles.summaryGstRow}>
                <span className={styles.summaryGstLabel}>
                  <span className={styles.gstBadge}>{gst.isIntraState ? 'Intra-State' : 'Inter-State'}</span>
                  Base Price
                </span>
                <span className={styles.summaryGstValue}>{formatPrice(gst.basePrice)}</span>
              </div>
              <div className={styles.summaryGstRow}>
                <span className={styles.summaryGstLabel}>CGST (5%)</span>
                <span className={styles.summaryGstValue}>{formatPrice(gst.cgst)}</span>
              </div>
              {!gst.isIntraState && (
                <div className={styles.summaryGstRow}>
                  <span className={styles.summaryGstLabel}>SGST (5%)</span>
                  <span className={styles.summaryGstValue}>{formatPrice(gst.sgst)}</span>
                </div>
              )}
            </>
          )}
          {discount > 0 && (
            <div className={styles.summaryRow}>
              <span>Discount ({coupon?.code})</span>
              <span className={styles.summaryDiscount}>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className={styles.summaryRow}>
            <span>Shipping</span>
            <span className={styles.summaryValue}>
              {shippingQuote.loading ? (
                <span className={styles.shippingCalc}>Calculating…</span>
              ) : !shippingQuote.serviceable ? (
                <span className={styles.shippingUnavailable}>Unavailable</span>
              ) : shipping === 0 ? 'FREE' : (
                <>
                  {formatPrice(shipping)}
                  {shippingQuote.isApproximate && (
                    <span className={styles.approxBadge}>~approx</span>
                  )}
                </>
              )}
            </span>
          </div>
          <hr className={styles.summaryDivider} />
          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>

          {!shippingQuote.serviceable && selectedAddr && (
            <div className={styles.unserviceableBanner}>
              🚫 Delivery is not available for pincode {selectedAddr.pincode}. Please select a different address.
            </div>
          )}

          <button className={styles.payBtn} onClick={handlePlaceOrder} disabled={
            processing ||
            !selectedAddress ||
            (!isBuyNow && items.length === 0) ||
            shippingQuote.loading ||
            !shippingQuote.serviceable ||
            !!shippingQuote.error
          }>
            {processing ? 'Processing...' : `Pay ${formatPrice(grandTotal)}`}
          </button>

          <div className={styles.secureNote}>
            🔒 Secured by Razorpay
          </div>
        </div>
      </div>

      {processing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <p>Processing your order...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Checkout</h1>
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={styles.spinner} />
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
