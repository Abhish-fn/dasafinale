'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './admin.module.css';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/products', label: 'Products', icon: '🛍️' },
  { href: '/admin/coupons', label: 'Coupons', icon: '🏷️' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated' && session?.user?.role !== 'admin') router.push('/');
  }, [status, session, router]);

  if (status === 'loading' || session?.user?.role !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-gray-200)', borderTopColor: 'var(--color-primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Mobile toggle */}
      <button className={styles.mobileToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrand}>DasaDinusulu</div>
          <div className={styles.sidebarTag}>Admin Panel</div>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>
            ← Back to Store
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
