'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Footer.module.css';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop All' },
  { href: '/about', label: 'About Us' },
  { href: '/about#contact', label: 'Contact Us' },
  { href: '/track', label: 'Track Order' },
];

const categories = [
  { href: '/products?category=Clay%20Pot%20Roasted%20Seeds%20%26%20Superfoods', label: 'Roasted Seeds' },
  { href: '/products?category=Healthy%20Chips%20%26%20Crisps',                  label: 'Healthy Chips' },
  { href: '/products?category=Palm%20Jaggery%20Millet%20Biscuits',              label: 'Jaggery Biscuits' },
  { href: '/products?category=Premium%20Healthy%20Sweets',                      label: 'Healthy Sweets' },
  { href: '/products?category=Protein%20%26%20Energy%20Snacks',                 label: 'Protein Snacks' },
  { href: '/products?category=Traditional%20Millet%20Savoury%20Snacks',         label: 'Millet Snacks' },
];

export default function Footer() {
  const pathname = usePathname();

  // Hide store footer on admin routes — admin has its own layout
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div>
            <div className={styles.brand}>
              <span><span className="brand-subtle">www.</span>DasaDinusulu<span className="brand-subtle">.com</span></span>
            </div>
            <p className={styles.tagline}>A Product by VDF</p>
            <p className={styles.description}>
              Rooted in the rich culinary traditions of Andhra Pradesh,
              <span className="brand-subtle">www.</span>DasaDinusulu<span className="brand-subtle">.com</span> brings you ten treasured snacks crafted with love,
              purity, and the finest natural ingredients.
            </p>
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                📍 Andhra Pradesh, India
              </div>
              <div className={styles.contactItem}>
                ✉️ hello@dasadinusulu.com
              </div>
              <div className={styles.contactItem}>
                📞 +91 98765 43210
              </div>
            </div>
          </div>

          <div>
            <h3 className={styles.heading}>Quick Links</h3>
            <nav className={styles.linkList}>
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className={styles.heading}>Categories</h3>
            <nav className={styles.linkList}>
              {categories.map((link) => (
                <Link key={link.href} href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className={styles.heading}>Policies</h3>
            <nav className={styles.linkList}>
              <Link href="/privacy-policy" className={styles.link}>Privacy Policy</Link>
              <Link href="/terms-and-conditions" className={styles.link}>Terms &amp; Conditions</Link>
              <Link href="/shipping-policy" className={styles.link}>Shipping Policy</Link>
              <Link href="/refund-and-returns" className={styles.link}>Refund &amp; Returns</Link>
            </nav>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} <span className="brand-subtle">www.</span>DasaDinusulu<span className="brand-subtle">.com</span> | A Product by VDF | All Rights Reserved
          </span>
        </div>
      </div>
    </footer>
  );
}