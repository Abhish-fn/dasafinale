import Link from 'next/link';
import styles from './Footer.module.css';

const quickLinks = [
  { href: '/products', label: 'All Products' },
  { href: '/cart', label: 'Cart' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/orders', label: 'My Orders' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div>
            <div className={styles.brand}>
              <span>🌿</span> DasaDinusulu
            </div>
            <p className={styles.tagline}>Healthy Snacking, Reimagined</p>
            <p className={styles.description}>
              Premium healthy snacks crafted with millets, seeds, and superfoods.
              Every bite is a step towards a healthier you.
            </p>
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
            <h3 className={styles.heading}>Get in Touch</h3>
            <div className={styles.contactItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              hello@dasadinusulu.com
            </div>
            <div className={styles.contactItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +91 98765 43210
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} DasaDinusulu. All rights reserved.
          </span>
          <span className={styles.madeWith}>
            Made with ❤️ for healthy snacking
          </span>
        </div>
      </div>
    </footer>
  );
}
