import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Refund & Returns',
  description:
    'Refund and Returns Policy for dasadinusulu.com — Learn about return eligibility, refund timelines, cancellation, and how to report issues.',
};

export default function RefundAndReturnsPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Returns &amp; Refunds Policy</h1>
        <p className={styles.meta}>
          <strong>Effective Date:</strong> 20 July 2026 &nbsp;·&nbsp;{' '}
          <strong>Last Updated:</strong> 20 July 2026
        </p>
      </header>

      {/* Body */}
      <div className={styles.body}>
        <p>
          This Returns and Refunds Policy is provided in accordance with the Consumer Protection
          Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020, which require clear
          disclosure of our cancellation, return, and refund terms before purchase. It should be
          read together with our{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link> and{' '}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>

        {/* 1. Return Eligibility */}
        <h2>1. Return Eligibility</h2>
        <p>
          We accept return, replacement, or refund requests only in the following cases:
        </p>
        <ul>
          <li>
            The product arrived <strong>damaged or leaking</strong>
          </li>
          <li>
            You received the <strong>wrong item</strong>
          </li>
          <li>
            The product has a genuine <strong>quality issue</strong> (e.g. spoiled, stale, or
            contains a foreign object)
          </li>
        </ul>
        <p>
          Because our products are consumable food items,{' '}
          <strong>
            we do not accept returns once a product has been opened or consumed
          </strong>
          , other than for the quality issues listed above. This is for hygiene and food-safety
          reasons, and is consistent with our{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link>.
        </p>

        {/* 2. Return Window */}
        <h2>2. Return Window</h2>
        <p>
          You must report any issue within <strong>48 hours of delivery</strong>. Requests raised
          after this window may not be eligible for a return, replacement, or refund, except where
          required by law.
        </p>

        {/* 3. How to Initiate a Return */}
        <h2>3. How to Initiate a Return</h2>
        <p>
          To report an issue, contact us at{' '}
          <a href="mailto:popularsnacksbazar@gmail.com">popularsnacksbazar@gmail.com</a> or{' '}
          <strong>+91 98765 43210</strong> with:
        </p>
        <ul>
          <li>Your order number</li>
          <li>A description of the issue</li>
          <li>
            Clear photos (and a video, if possible) of the product and its packaging as received
          </li>
        </ul>
        <p>
          Depending on the issue, we may either arrange a reverse pickup through Delhivery, or
          process your replacement/refund directly based on the evidence provided, without
          requiring the product to be physically returned — at our discretion.
        </p>

        {/* 4. Refund Process */}
        <h2>4. Refund Process</h2>
        <ul>
          <li>
            Approved refunds are processed to your{' '}
            <strong>original payment method via Razorpay</strong> within{' '}
            <strong>5–7 business days</strong> of approval.
          </li>
          <li>
            Depending on your bank or payment provider, it may take an additional 2–3 business
            days for the refund to reflect in your account.
          </li>
          <li>We do not offer cash refunds.</li>
          <li>
            You will receive an email/SMS confirmation once your refund has been initiated.
          </li>
        </ul>

        {/* 5. Non-Returnable Items */}
        <h2>5. Non-Returnable Items</h2>
        <p>The following are not eligible for return, replacement, or refund:</p>
        <ul>
          <li>
            Products that have been opened, consumed, or partially consumed (except for verified
            quality issues)
          </li>
          <li>Products returned without their original packaging or labelling</li>
          <li>Requests raised after the 48-hour return window</li>
          <li>
            Change-of-mind returns (e.g. no longer wanting the flavour/product ordered)
          </li>
        </ul>

        {/* 6. Cancellation Policy */}
        <h2>6. Cancellation Policy</h2>
        <ul>
          <li>
            <strong>Before dispatch:</strong> You may cancel your order free of charge for a full
            refund. Contact us as soon as possible, as orders are processed quickly.
          </li>
          <li>
            <strong>After dispatch:</strong> Once an order has been handed over to Delhivery, it
            cannot be cancelled through us directly. If you refuse the delivery at your doorstep,
            applicable shipping charges (both outbound and return) will be deducted from your
            refund.
          </li>
        </ul>

        {/* 7. Exchange Policy */}
        <h2>7. Exchange Policy</h2>
        <p>
          We do not currently offer product-to-product exchanges (e.g. swapping flavours, sizes,
          or items). If you receive a damaged or incorrect item, we will send a replacement of the
          same product, subject to availability, or issue a refund if a replacement is not
          available.
        </p>

        {/* 8. Contact for Returns */}
        <h2>8. Contact for Returns</h2>
        <p>
          For any return, refund, or cancellation request, reach out to us at:
        </p>
        <div className={styles.callout}>
          <strong>Email:</strong>{' '}
          <a href="mailto:popularsnacksbazar@gmail.com">popularsnacksbazar@gmail.com</a>
          <br />
          <strong>Phone:</strong> +91 98765 43210
          <br />
          <strong>Hours:</strong> Mon–Sat, 10 AM – 6 PM IST
        </div>
        <p>
          Please have your order number ready when contacting us for faster resolution.
        </p>

        <hr className={styles.divider} />
      </div>
    </div>
  );
}
