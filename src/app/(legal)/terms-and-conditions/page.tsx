import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms and Conditions for dasadinusulu.com — operated by Leela Vijaya Durga Foods. Read our terms of use, ordering, shipping, returns, and more.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Terms &amp; Conditions</h1>
        <p className={styles.meta}>
          <strong>Effective Date:</strong> 20 July 2026 &nbsp;·&nbsp;{' '}
          <strong>Last Updated:</strong> 20 July 2026
        </p>
      </header>

      {/* Body */}
      <div className={styles.body}>
        {/* 1. Introduction */}
        <h2>1. Introduction and Acceptance</h2>
        <p>
          These Terms and Conditions (&quot;<strong>Terms</strong>&quot;) govern your access to and
          use of dasadinusulu.com (the &quot;<strong>Site</strong>&quot;), operated by{' '}
          <strong>Leela Vijaya Durga Foods</strong> (&quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;). By browsing the Site, creating an account, or placing an order, you
          agree to be bound by these Terms, along with our{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>. If you do not agree, please do not
          use the Site.
        </p>
        <p>
          These Terms constitute a legally binding electronic contract under Section 10A of the
          Information Technology Act, 2000, and are formed in accordance with the principles of
          offer, acceptance, and consideration under the Indian Contract Act, 1872. They are
          further governed by the Consumer Protection Act, 2019, and the rules made thereunder,
          including the Consumer Protection (E-Commerce) Rules, 2020.
        </p>

        <hr className={styles.divider} />

        {/* 2. Definitions */}
        <h2>2. Definitions</h2>
        <ul>
          <li>
            &quot;<strong>Site</strong>&quot; means dasadinusulu.com and all associated pages, apps,
            and services.
          </li>
          <li>
            &quot;<strong>Products</strong>&quot; means the snacks and food items listed for sale on
            the Site.
          </li>
          <li>
            &quot;<strong>Order</strong>&quot; means a request placed by you to purchase Products.
          </li>
          <li>
            &quot;<strong>You</strong>&quot; / &quot;<strong>Customer</strong>&quot; means the person
            accessing or purchasing from the Site.
          </li>
        </ul>

        <hr className={styles.divider} />

        {/* 3. Eligibility */}
        <h2>3. Eligibility</h2>
        <p>
          You must be at least 18 years old and competent to enter into a contract under the Indian
          Contract Act, 1872 to place an Order. If you are under 18, you may use the Site only with
          the involvement of a parent or legal guardian who completes the transaction on your
          behalf.
        </p>

        <hr className={styles.divider} />

        {/* 4. Account Registration */}
        <h2>4. Account Registration</h2>
        <p>If the Site allows account creation, you agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information</li>
          <li>Keep your login credentials confidential</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
        </ul>
        <p>You are responsible for all activity that occurs under your account.</p>

        <hr className={styles.divider} />

        {/* 5. Products and Pricing */}
        <h2>5. Products and Pricing</h2>
        <ul>
          <li>
            Product images are for illustrative purposes; actual appearance, texture, and packaging
            of food items may vary slightly due to natural variation.
          </li>
          <li>
            All prices are listed in Indian Rupees (INR) and are inclusive of applicable GST unless
            stated otherwise at checkout.
          </li>
          <li>
            GST is charged as CGST + SGST for intra-state orders and IGST for inter-state orders,
            in accordance with applicable Indian tax law.
          </li>
          <li>
            We reserve the right to modify prices, discontinue Products, or correct listing errors
            at any time without prior notice.
          </li>
          <li>
            If a Product is listed at an incorrect price due to a technical or human error, we
            reserve the right to cancel the affected Order and issue a full refund, even if payment
            has already been confirmed.
          </li>
        </ul>

        <hr className={styles.divider} />

        {/* 6. Orders */}
        <h2>6. Orders</h2>
        <ul>
          <li>
            Placing an Order constitutes an offer to purchase, not an acceptance. A contract is
            formed only when we send you an order confirmation.
          </li>
          <li>
            We reserve the right to refuse, limit, or cancel any Order for reasons including but not
            limited to: Product unavailability, pricing or listing errors, suspected fraudulent
            activity, or inability to verify payment.
          </li>
          <li>
            Order confirmation is subject to Product availability at the time of processing, even if
            the Order was successfully placed on the Site.
          </li>
        </ul>

        <hr className={styles.divider} />

        {/* 7. Payments */}
        <h2>7. Payments</h2>
        <ul>
          <li>
            Payments are processed securely through Razorpay. We do not store your card, UPI, or net
            banking credentials — see our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link> for details.
          </li>
          <li>
            Accepted payment methods are those enabled through Razorpay at checkout (cards, UPI, net
            banking, and wallets, as applicable).
          </li>
          <li>Full payment is required at the time of placing an Order unless otherwise stated.</li>
          <li>
            In case of a failed or disputed transaction, please contact us with your
            order/transaction reference for resolution.
          </li>
        </ul>

        <hr className={styles.divider} />

        {/* 8. Shipping and Delivery */}
        <h2>8. Shipping and Delivery</h2>
        <ul>
          <li>
            Orders are delivered via Delhivery, our logistics partner, to serviceable pin codes
            across India.
          </li>
          <li>
            Delivery timelines shown at checkout are estimates only and are not guaranteed. Delays
            may occur due to courier logistics, weather, regional disruptions, or other factors
            beyond our control.
          </li>
          <li>
            Shipping charges, if any, will be clearly displayed at checkout before payment.
          </li>
          <li>
            If delivery fails after reasonable attempts (e.g. incorrect address, unavailability of
            recipient), the Order may be returned to origin; re-delivery charges may apply.
          </li>
          <li>We currently ship only within India.</li>
        </ul>
        <p>
          For full details, please refer to our{' '}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>

        <hr className={styles.divider} />

        {/* 9. Cancellations, Returns, and Refunds */}
        <h2>9. Cancellations, Returns, and Refunds</h2>
        <p>
          Because our Products are perishable, consumable food items, our return policy is more
          limited than for non-food goods, for hygiene and safety reasons:
        </p>

        <h3>Cancellation</h3>
        <p>
          You may cancel an Order free of charge before it has been dispatched, by contacting us at{' '}
          <a href="mailto:popularsnacksbazar@gmail.com">popularsnacksbazar@gmail.com</a>. Once an
          Order is dispatched, it cannot be cancelled. In accordance with the Consumer Protection
          (E-Commerce) Rules, 2020, we do not levy a cancellation charge on you for a permitted
          cancellation unless we would bear a similar charge ourselves as a result.
        </p>

        <h3>Returns</h3>
        <p>
          We accept returns/replacements only in the following cases, reported within{' '}
          <strong>48 hours</strong> of delivery with photo or video evidence:
        </p>
        <ul>
          <li>Product delivered damaged or leaking</li>
          <li>Wrong item delivered</li>
          <li>Product significantly not as described</li>
        </ul>
        <p>
          We do not accept returns for change of mind, or once a package has been opened, other than
          the cases listed above.
        </p>

        <h3>Refunds</h3>
        <p>
          Approved refunds are processed to your original payment method within{' '}
          <strong>7–10 business days</strong> of approval. Processing times beyond this may depend
          on your bank or payment provider.
        </p>
        <p>
          This policy is displayed in accordance with the Consumer Protection (E-Commerce) Rules,
          2020. For full details, please refer to our{' '}
          <Link href="/refund-and-returns">Refund &amp; Returns Policy</Link>.
        </p>

        <hr className={styles.divider} />

        {/* 10. Nutrition, Health, and Allergen Disclaimer */}
        <h2>10. Nutrition, Health, and Allergen Disclaimer</h2>
        <ul>
          <li>
            Product descriptions, nutritional claims, and health-related information on the Site are
            provided for general informational purposes only and do not constitute medical or
            dietary advice.
          </li>
          <li>
            Please read the ingredient list and allergen information on the Product packaging
            carefully before consumption, especially if you have food allergies, intolerances, or
            dietary restrictions.
          </li>
          <li>
            Our Products are manufactured in a facility that may also process common allergens,
            including but not limited to nuts, gluten, dairy, and soy. Cross-contamination is
            possible.
          </li>
          <li>
            We are not liable for adverse reactions arising from undisclosed allergies, failure to
            read packaging information, or misuse of the Product.
          </li>
          <li>
            Terms such as &quot;healthy&quot; or &quot;natural&quot; reflect our sourcing and
            preparation practices and are not a substitute for professional medical or nutritional
            advice. Please consult a healthcare provider for specific dietary concerns.
          </li>
        </ul>

        <hr className={styles.divider} />

        {/* 11. Food Safety and Regulatory Compliance */}
        <h2>11. Food Safety and Regulatory Compliance</h2>
        <ul>
          <li>
            <strong>FSSAI License Number:</strong> 10121006000692
          </li>
          <li>
            Products are manufactured, packaged, and labelled in accordance with applicable Food
            Safety and Standards Authority of India (FSSAI) regulations.
          </li>
          <li>
            Best-before/expiry dates are printed on Product packaging. Once delivered, you are
            responsible for storing the Product as per the instructions on the packaging and
            consuming it within the indicated timeframe.
          </li>
        </ul>

        <hr className={styles.divider} />

        {/* 12. Intellectual Property */}
        <h2>12. Intellectual Property</h2>
        <p>
          All content on the Site — including logos, Product photography, text, graphics, and design
          — is owned by or licensed to us and is protected under applicable intellectual property
          law. You may not reproduce, distribute, or use this content without our prior written
          consent.
        </p>

        <hr className={styles.divider} />

        {/* 13. User Conduct */}
        <h2>13. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Place fraudulent or unauthorized Orders</li>
          <li>
            Attempt to interfere with, hack, or disrupt the Site&apos;s security or functionality
          </li>
          <li>Scrape, copy, or misuse Site content or pricing data</li>
          <li>Upload or transmit unlawful, harmful, or infringing content through the Site</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate access for any user who violates these Terms.
        </p>

        <hr className={styles.divider} />

        {/* 14. Limitation of Liability */}
        <h2>14. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, we are not liable for indirect,
          incidental, or consequential damages arising from your use of the Site or Products. Our
          total liability for any claim relating to an Order is limited to the value of that Order.
        </p>
        <p>
          Nothing in this section limits or excludes any liability that cannot be limited or
          excluded under the Consumer Protection Act, 2019, or other applicable Indian law —
          including liability for defective, unsafe, or misrepresented Products.
        </p>

        <hr className={styles.divider} />

        {/* 15. Indemnification */}
        <h2>15. Indemnification</h2>
        <p>
          You agree to indemnify and hold us harmless from any claims, damages, or expenses arising
          from your breach of these Terms or misuse of the Site.
        </p>

        <hr className={styles.divider} />

        {/* 16. Force Majeure */}
        <h2>16. Force Majeure</h2>
        <p>
          We are not liable for any delay or failure to perform our obligations due to events beyond
          our reasonable control, including natural disasters, strikes, courier disruptions,
          government action, or other force majeure events.
        </p>

        <hr className={styles.divider} />

        {/* 17. Grievance Redressal */}
        <h2>17. Grievance Redressal</h2>
        <p>
          In accordance with Rule 4 of the Consumer Protection (E-Commerce) Rules, 2020 and the
          Information Technology Act, 2000, grievances relating to the Site or an Order may be
          directed to our Grievance Officer:
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
          We will acknowledge receipt of your complaint within <strong>48 hours</strong> and
          endeavor to resolve it within <strong>one month</strong> from the date of receipt, as
          required under the Rules.
        </p>

        <hr className={styles.divider} />

        {/* 18. Governing Law */}
        <h2>18. Governing Law and Jurisdiction</h2>
        <p>
          These Terms are governed by the laws of India. Any disputes arising from these Terms or
          your use of the Site shall be subject to the exclusive jurisdiction of the courts in{' '}
          <strong>Vijayawada, Andhra Pradesh</strong>, without prejudice to any right you have to
          approach a Consumer Disputes Redressal Commission under the Consumer Protection Act, 2019.
        </p>

        <hr className={styles.divider} />

        {/* 19. Amendments */}
        <h2>19. Amendments</h2>
        <p>
          We may revise these Terms from time to time. The &quot;Last Updated&quot; date at the top
          of this page reflects the most recent revision. Continued use of the Site after changes
          constitutes your acceptance of the updated Terms.
        </p>

        <hr className={styles.divider} />

        {/* 20. Severability */}
        <h2>20. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable, the remaining provisions
          will continue in full force and effect.
        </p>

        <hr className={styles.divider} />

        {/* 21. Contact Us */}
        <h2>21. Contact Us</h2>
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
