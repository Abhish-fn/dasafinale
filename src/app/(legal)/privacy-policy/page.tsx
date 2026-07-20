import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy of dasadinusulu.com — Learn how Leela Vijaya Durga Foods collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.meta}>
          <strong>Effective Date:</strong> 20 July 2026 &nbsp;·&nbsp;{' '}
          <strong>Last Updated:</strong> 20 July 2026
        </p>
      </header>

      {/* Body */}
      <div className={styles.body}>
        {/* 1. Introduction */}
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy explains how <strong>Leela Vijaya Durga Foods</strong>{' '}
          (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), the operator of{' '}
          <strong>dasadinusulu.com</strong> (the &quot;Site&quot;), collects, uses, discloses, and
          safeguards your personal information when you visit the Site or place an order with us. By
          using the Site, you agree to the practices described in this policy.
        </p>
        <p>If you do not agree with this policy, please do not use the Site.</p>

        {/* 2. Information We Collect */}
        <h2>2. Information We Collect</h2>

        <h3>2.1 Information you provide directly</h3>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Shipping address and billing address</li>
          <li>Account login details, if you create an account</li>
          <li>Order history (items purchased, quantities, order value)</li>
          <li>Any information you provide when contacting customer support</li>
        </ul>

        <h3>2.2 Information collected automatically</h3>
        <ul>
          <li>IP address, browser type, device type</li>
          <li>Pages visited, time on page, referring URL</li>
          <li>Cookies and similar tracking technologies (see Section 7)</li>
        </ul>

        <h3>2.3 Payment information</h3>
        <p>
          Payments on the Site are processed through <strong>Razorpay</strong>, a PCI-DSS compliant
          payment gateway. We do <strong>not</strong> store your full card number, CVV, UPI PIN, or
          net-banking credentials on our servers — this information is collected and processed
          directly by Razorpay under{' '}
          <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">
            Razorpay&apos;s own privacy policy
          </a>
          . We only receive and store a transaction reference, payment status, and amount for
          order-reconciliation purposes.
        </p>

        {/* 3. How We Use Your Information */}
        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process, confirm, and fulfill your orders</li>
          <li>Communicate order confirmations, shipping, and delivery updates</li>
          <li>Respond to customer support requests</li>
          <li>Improve the Site, our products, and the shopping experience</li>
          <li>Detect and prevent fraud or misuse</li>
          <li>Comply with legal and tax obligations</li>
          <li>
            Send promotional communications, where you have opted in (you may unsubscribe at any
            time)
          </li>
        </ul>

        {/* 4. How We Share Your Information */}
        <h2>4. How We Share Your Information</h2>
        <p>
          We share personal information only as needed to run the business, and never sell it.
        </p>

        <h3>4.1 Delhivery (shipping partner)</h3>
        <p>
          To deliver your order, we share your <strong>name, phone number, and delivery address</strong>{' '}
          with Delhivery, our logistics partner. Delhivery uses this information solely to complete
          the delivery and may contact you directly regarding delivery status.
        </p>

        <h3>4.2 Razorpay (payment partner)</h3>
        <p>
          As described in Section 2.3, payment details are handled directly by Razorpay to process
          your transaction.
        </p>

        <h3>4.3 Infrastructure and service providers</h3>
        <ul>
          <li>
            <strong>MongoDB Atlas</strong> — securely hosts our application database
          </li>
          <li>
            <strong>Cloudinary</strong> — hosts and delivers product images (does not process
            personal/customer data)
          </li>
        </ul>
        <p>
          These providers act on our instructions and are contractually restricted from using your
          data for their own purposes.
        </p>

        <h3>4.4 Legal requirements</h3>
        <p>
          We may disclose information if required by law, regulation, legal process, or a valid
          request from government or law enforcement authorities.
        </p>

        <h3>4.5 We do not sell your data</h3>
        <p>
          We do not sell, rent, or trade your personal information to third parties for their
          marketing purposes.
        </p>

        {/* 5. Data Storage and Security */}
        <h2>5. Data Storage and Security</h2>
        <ul>
          <li>All data in transit is encrypted via HTTPS/TLS.</li>
          <li>Passwords, where applicable, are stored using industry-standard hashing.</li>
          <li>
            Access to customer data is restricted to personnel who need it to operate the Site.
          </li>
          <li>
            We follow reasonable security practices as required under Section 43A of the Information
            Technology Act, 2000 and the Information Technology (Reasonable Security Practices and
            Procedures and Sensitive Personal Data or Information) Rules, 2011.
          </li>
        </ul>
        <p>
          No method of transmission or storage is 100% secure; while we work to protect your data,
          we cannot guarantee absolute security.
        </p>

        {/* 5A. Data Location */}
        <h2>6. Data Location</h2>
        <p>
          Your data is processed and stored within India using cloud infrastructure providers
          (MongoDB Atlas, Cloudinary) that offer India-region hosting. We do not intentionally
          transfer your personal data outside India. In the event any service provider processes data
          outside India, we ensure appropriate safeguards are in place in accordance with applicable
          law.
        </p>

        {/* 6. Data Retention */}
        <h2>7. Data Retention</h2>
        <p>
          We retain personal and order data for as long as necessary to fulfill the purposes
          described in this policy, including a minimum retention period for financial and tax
          records as required under Indian law (typically up to 8 years for accounting records). You
          may request earlier deletion of non-essential data under Section 9.
        </p>

        {/* 7. Cookies */}
        <h2>8. Cookies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Keep you logged in and remember your cart</li>
          <li>Understand site usage and improve performance</li>
        </ul>
        <p>
          We do not use any third-party analytics or advertising trackers. You can control or
          disable cookies through your browser settings; disabling some cookies may affect Site
          functionality (e.g., you may not be able to stay logged in or maintain your cart).
        </p>

        {/* 8. Data Breach Notification */}
        <h2>9. Data Breach Notification</h2>
        <p>
          In the unlikely event of a data breach that may compromise your personal information, we
          will notify affected users via email and/or a prominent notice on the Site within 72
          hours of becoming aware of the breach, in accordance with evolving requirements under
          the Digital Personal Data Protection Act, 2023 and applicable CERT-In directives.
        </p>

        {/* 9. Your Rights */}
        <h2>10. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate or incomplete data</li>
          <li>Request deletion of your data, subject to legal retention requirements</li>
          <li>Withdraw consent for marketing communications at any time</li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <strong>
            <a href="mailto:popularsnacksbazar@gmail.com">popularsnacksbazar@gmail.com</a>
          </strong>
          . We aim to respond within 30 days.
        </p>
        <div className={styles.callout}>
          <strong>Note:</strong> India&apos;s Digital Personal Data Protection Act, 2023 is being
          rolled out in phases, with full obligations becoming enforceable from May 2027. We honor
          the rights above as good practice ahead of that deadline.
        </div>

        {/* 10. Children's Privacy */}
        <h2>11. Children&apos;s Privacy</h2>
        <p>
          The Site is not directed at individuals under the age of 18. We do not knowingly collect
          personal information from minors. If you are under 18, please use the Site only with the
          involvement of a parent or guardian.
        </p>

        {/* 11. Third-Party Links */}
        <h2>12. Third-Party Links</h2>
        <p>
          The Site may contain links to third-party websites. We are not responsible for the privacy
          practices or content of those sites. We encourage you to review their privacy policies
          separately.
        </p>

        {/* 12. Grievance Officer */}
        <h2>13. Grievance Officer</h2>
        <p>
          In accordance with Rule 5(9) of the IT (Reasonable Security Practices and Procedures and
          Sensitive Personal Data or Information) Rules, 2011 and the Consumer Protection
          (E-Commerce) Rules, 2020, the Grievance Officer for the Site is:
        </p>
        <div className={styles.callout}>
          <strong>Name:</strong> [To be filled]
          <br />
          <strong>Designation:</strong> [To be filled]
          <br />
          <strong>Email:</strong>{' '}
          <a href="mailto:popularsnacksbazar@gmail.com">popularsnacksbazar@gmail.com</a>
          <br />
          <strong>Address:</strong> Maruthi Nagar, Vijayawada, Andhra Pradesh — 520004
        </div>
        <p>
          Complaints will be acknowledged and resolved within the timelines prescribed under
          applicable law.
        </p>

        {/* 13. FSSAI Disclosure */}
        <h2>14. FSSAI Disclosure</h2>
        <p>
          As a food business, our FSSAI License Number is displayed on the Site as required by law:{' '}
          <strong>10121006000692</strong>
        </p>

        {/* 14. Changes to This Policy */}
        <h2>15. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last Updated&quot; date at
          the top of this page will reflect the most recent revision. Continued use of the Site
          after changes constitutes acceptance of the updated policy.
        </p>

        {/* 15. Governing Law */}
        <h2>16. Governing Law</h2>
        <p>
          This policy is governed by the laws of India. Any disputes will be subject to the
          exclusive jurisdiction of the courts in <strong>Vijayawada, Andhra Pradesh</strong>.
        </p>

        {/* 16. Contact Us */}
        <h2>17. Contact Us</h2>
        <p>
          <strong>Leela Vijaya Durga Foods</strong>
          <br />
          Maruthi Nagar, Vijayawada, Andhra Pradesh — 520004
          <br />
          Email:{' '}
          <a href="mailto:popularsnacksbazar@gmail.com">popularsnacksbazar@gmail.com</a>
          <br />
          Phone: +91 98765 43210
        </p>

        <hr className={styles.divider} />
      </div>
    </div>
  );
}
