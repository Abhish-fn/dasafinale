'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './account.module.css';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading' || !session?.user) {
    return (
      <div className={styles.container}>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-gray-200)', borderTopColor: 'var(--color-primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: '📦', label: 'My Orders', desc: 'View order history and track shipments', href: '/orders' },
    { icon: '❤️', label: 'Wishlist', desc: 'Products you\'ve saved for later', href: '/wishlist' },
    { icon: '📍', label: 'Addresses', desc: 'Manage delivery addresses', href: '/checkout' },
    { icon: '🛒', label: 'Cart', desc: 'View items in your shopping cart', href: '/cart' },
  ];

  if (session.user.role === 'admin') {
    menuItems.push({ icon: '📊', label: 'Admin Dashboard', desc: 'Manage products, orders, and coupons', href: '/admin' });
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>My Account</h1>

      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {session.user.image ? (
            <Image src={session.user.image} alt={session.user.name || 'User'} fill sizes="72px" />
          ) : (
            <span className={styles.avatarLetter}>
              {session.user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{session.user.name || 'User'}</div>
          <div className={styles.profileEmail}>{session.user.email}</div>
          {session.user.role === 'admin' && (
            <span className={styles.profileBadge}>Admin</span>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Links</h2>
        <div className={styles.menuList}>
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.menuItem}>
              <span className={styles.menuIcon}>{item.icon}</span>
              <div className={styles.menuInfo}>
                <div className={styles.menuLabel}>{item.label}</div>
                <div className={styles.menuDesc}>{item.desc}</div>
              </div>
              <span className={styles.menuArrow}>→</span>
            </Link>
          ))}
        </div>
      </div>

      <button className={styles.dangerBtn} onClick={() => signOut({ callbackUrl: '/' })}>
        Sign Out
      </button>
    </div>
  );
}
