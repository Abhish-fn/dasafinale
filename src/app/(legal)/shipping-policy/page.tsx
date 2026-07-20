import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description:
    'Shipping Policy for dasadinusulu.com — Learn about delivery timelines, shipping charges, tracking, and coverage across India.',
};

export default function ShippingPolicyPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Shipping Policy</h1>
        <p className={styles.meta}>
          <strong>Effective Date:</strong> 20 July 2026 &nbsp;·&nbsp;{' '}
          <strong>Last Updated:</strong> 20 July 2026
        </p>
      </header>

      {/* Body */}
      <div className={styles.body}>
        <p>
          This Shipping Policy is provided in accordance with the Consumer Protection (E-Commerce)
          Rules, 2020, which require clear pre-purchase disclosure of delivery timelines, charges,
          and related terms. It should be read together with our{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link> and{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>

        {/* 1. Shipping Coverage */}
        <h2>1. Shipping Coverage</h2>
        <p>
          We currently ship pan-India through our logistics partner, <strong>Delhivery</strong>, to
          all pin codes serviceable by them. Serviceability for your specific pin code is checked
          automatically at checkout — if we&apos;re unable to deliver to your location, you&apos;ll
          be notified before payment.
        </p>
        <p>
          All products are securely packaged to help preserve freshness and protect against damage
          in transit.
        </p>

        {/* 2. Processing Time */}
        <h2>2. Processing Time</h2>
        <p>
          Orders are processed and handed over to Delhivery within{' '}
          <strong>1–2 business days</strong> of order confirmation (excluding Sundays and public
          holidays). Orders placed after <strong>2:00 PM IST</strong> may be processed the
          following business day.
        </p>
        <p>
          Processing time is separate from, and in addition to, the delivery time shown in
          Section 3.
        </p>

        {/* 3. Estimated Delivery Times */}
        <h2>3. Estimated Delivery Times</h2>
        <p>Once dispatched, estimated delivery times by region are as follows:</p>
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Estimated Delivery</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Local / same city</td>
              <td>2–3 business days</td>
            </tr>
            <tr>
              <td>Same state</td>
              <td>3–5 business days</td>
            </tr>
            <tr>
              <td>Metro cities (other states)</td>
              <td>4–6 business days</td>
            </tr>
            <tr>
              <td>Rest of India</td>
              <td>5–7 business days</td>
            </tr>
            <tr>
              <td>Remote areas / Northeast / J&amp;K / Andaman &amp; Nicobar</td>
              <td>7–10 business days</td>
            </tr>
          </tbody>
        </table>
        <p>
          These are estimates provided by Delhivery and not guaranteed delivery dates. Actual
          delivery may vary due to weather, regional disruptions, festivals, or courier network
          delays.
        </p>

        {/* 4. Shipping Charges */}
        <h2>4. Shipping Charges</h2>
        <ul>
          <li>
            <strong>Free shipping</strong> on orders above <strong>₹1,499</strong>
          </li>
          <li>
            A flat shipping charge of <strong>₹79</strong> applies to orders below this threshold
          </li>
        </ul>
        <p>
          Applicable shipping charges (or the free shipping status) are shown at checkout before
          payment is made.
        </p>

        {/* 5. Order Tracking */}
        <h2>5. Order Tracking</h2>
        <p>
          Once your order is dispatched, you will receive your Delhivery AWB (Air Waybill) number
          via email and SMS. You can track your shipment:
        </p>
        <ul>
          <li>
            Directly on the{' '}
            <a
              href="https://www.delhivery.com/track-v2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Delhivery tracking page
            </a>
          </li>
          <li>
            Through the{' '}
            <Link href="/track">order tracking section</Link> on the Site
          </li>
        </ul>

        {/* 6. Delivery Attempts and Failed Delivery */}
        <h2>6. Delivery Attempts and Failed Delivery</h2>
        <ul>
          <li>
            Delhivery will typically make <strong>3 delivery attempts</strong> to the address
            provided.
          </li>
          <li>
            Please ensure the shipping address and phone number provided at checkout are accurate
            and reachable, as the courier may call to confirm the delivery.
          </li>
          <li>
            If all delivery attempts are unsuccessful, the shipment will be returned to origin
            (RTO). In such cases, we will contact you to arrange re-shipment; additional shipping
            charges may apply for re-delivery.
          </li>
        </ul>

        {/* 7. Shipping to Remote or Restricted Areas */}
        <h2>7. Shipping to Remote or Restricted Areas</h2>
        <p>
          Some remote, hilly, or restricted pin codes (including parts of the Northeast, Jammu
          &amp; Kashmir, Ladakh, and the Andaman &amp; Nicobar Islands) may:
        </p>
        <ul>
          <li>Have extended delivery timelines beyond those listed in Section 3</li>
          <li>
            Be temporarily unserviceable depending on Delhivery&apos;s network coverage
          </li>
          <li>
            Be subject to an additional remote-area shipping surcharge, shown at checkout where
            applicable
          </li>
        </ul>
        <p>
          If your pin code is unserviceable, this will be indicated at checkout before you complete
          payment.
        </p>

        {/* 8. Damaged, Missing, or Incorrect Items */}
        <h2>8. Damaged, Missing, or Incorrect Items in Transit</h2>
        <p>
          If your order arrives damaged, tampered with, or you receive an incorrect item, please
          report it within <strong>48 hours of delivery</strong> along with photos or videos of
          the packaging and product, as described in our{' '}
          <Link href="/terms-and-conditions">Terms and Conditions</Link>. Verified claims will be
          resolved via replacement or refund as per our{' '}
          <Link href="/refund-and-returns">Refund &amp; Returns Policy</Link>.
        </p>

        {/* 9. Contact for Shipping Issues */}
        <h2>9. Contact for Shipping Issues</h2>
        <p>
          For questions about an order in transit, delayed delivery, or tracking issues, reach out
          to us at:
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
          Please have your order number and AWB number ready when contacting us for faster
          resolution.
        </p>

        <hr className={styles.divider} />
      </div>
    </div>
  );
}
